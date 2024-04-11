/*
 * Ces scripts Arduino peuvent être utilisés avec le SenseCAP K1100.
 *
 * Ils ont été écrits à partir des documentations et exemples suivants :
 * - Quickstart : https://wiki.seeedstudio.com/K1100-quickstart/
 * - Capteur de lumière : https://wiki.seeedstudio.com/K1100-Light-Sensor-Grove-LoRa-E5/
 * - Capteur de température et d'humidité : https://wiki.seeedstudio.com/K1100-Temp-Humi-Sensor-Grove-LoRa-E5/
 * - Connexion LoRaWan avec Helium IoT : https://wiki.seeedstudio.com/Connecting-to-Helium/
 */

#include <SoftwareSerial.h>
#include <Arduino.h>
#include "disk91_LoRaE5.h"
#include <SensirionI2CSht4x.h>
#include <Wire.h>

SensirionI2CSht4x sht4x;

Disk91_LoRaE5 lorae5(&Serial);

#define Frequency DSKLORAE5_ZONE_EU868 // Fréquence européenne

char deveui[] = "<device-eui>"; // EUI présent sur le capteur Grove (et à insérer dans l'onglet "Configuration" sur Helium)
char appeui[] = "<application-eui>"; // Correspond au "Join EUI" sur Helium
char appkey[] = "<application-key>"; // Généré dans l'onglet "OTAA keys" de Helium


void data_decord(int val_1, int val_2, uint8_t data[4]) {
  int val[] = { val_1, val_2 };

  for (int i = 0, j = 0; i < 2; i++, j += 2) {
    if (val[i] < 0) {
      val[i] = ~val[i] + 1;
      data[j] = val[i] >> 8 | 0x80;
      data[j + 1] = val[i] & 0xFF;
    } else {
      data[j] = val[i] >> 8 & 0xFF;
      data[j + 1] = val[i] & 0xFF;
    }
  }
}


void setup(void) {
  Serial.begin(9600);

  uint32_t start = millis();
  while (!Serial && (millis() - start) < 1500);  // Ouvrir "Tools > Serial Monitor" dans Arduino IDE, ou attendre 1,5s

  Wire.begin();

  uint16_t error;
  char errorMessage[256];

  sht4x.begin(Wire, 0x44);

  uint32_t serialNumber;
  error = sht4x.serialNumber(serialNumber);
  delay(5000);
  if (error) {
    Serial.print("Error trying to execute serialNumber(): ");
    errorToString(error, errorMessage, 256);
    Serial.println(errorMessage);
  } else {
    Serial.print("Serial Number: ");
    Serial.println(serialNumber);
  }

  // Le Grove LoRa-E5 doit être branché sur le second port du Wio Terminal (celui de droite)
  // Sinon remplacer "_P2" par "_P1", ou mettre "DSKLORAE5_SEARCH_WIO" pour le trouver automatiquement
  if (!lorae5.begin(DSKLORAE5_SWSERIAL_WIO_P2)) {
    Serial.println("LoRa E5 Init Failed");
    while (1);
  }

  // Mettre en place les identifiants LoRaWan
  if (!lorae5.setup(
        Frequency,
        deveui,
        appeui,
        appkey)) {
    Serial.println("LoRa E5 Setup Failed");
    while (1);
  }
}

void loop(void) {
  uint16_t error;
  float temperature, humidity;
  int int_temp, int_humi;

  error = sht4x.measureHighPrecision(temperature, humidity);
  Serial.print("Temperature: ");
  Serial.print(temperature);
  Serial.print(" Humidity: ");
  Serial.println(humidity);

  int_temp = temperature * 100;
  int_humi = humidity * 100;

  // Utiliser data[] pour enregistrer les données des capteurs
  static uint8_t data[4] = { 0x00, 0x00, 0x00, 0x00 };

  data_decord(int_temp, int_humi, data); // Convertir les données en hexadécimal

  if (lorae5.send_sync(  // Sending the sensor values out
        8,               // LoRaWan Port
        data,            // data array
        sizeof(data),    // size of the data
        false,           // we are not expecting a ack
        7,               // Spread Factor
        14               // Tx Power in dBm
        )) {
    Serial.println("Uplink done");
    if (lorae5.isDownlinkReceived()) {
      Serial.println("A downlink has been received");
      if (lorae5.isDownlinkPending()) {
        Serial.println("More downlink are pending");
      }
    }
  }
  
  // Envoyer des données toutes les 15 minutes
  // Note : Il est possible que le que les premières tentatives de connexion échouent
  delay(15 * 60 * 1000);
}