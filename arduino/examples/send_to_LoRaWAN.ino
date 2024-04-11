/*
 * Exemple d'envoie des valeurs { 0x01, 0x02, 0x03, 0x04 } en LoRaWan à la console Helium IoT.
 * -> Ce script se base sur les documentations citées dans le script IntelliZon_LoRa_E5.ino
 */

#include <Arduino.h>
#include <array>
#include "disk91_LoRaE5.h"

Disk91_LoRaE5 lorae5(&Serial);  // Where the AT command and debut traces are printed

#define Frequency DSKLORAE5_ZONE_EU868

char deveui[] = "<device-eui>"; // EUI présent sur le capteur Grove (et à insérer dans l'onglet "Configuration" sur Helium)
char appeui[] = "<application-eui>"; // Correspond au "Join EUI" sur Helium
char appkey[] = "<application-key>"; // Généré dans l'onglet "OTAA keys" de Helium

void setup() {

  Serial.begin(115200);
  while (!Serial) {
    delay(100);
  }

  // init the library, search the LORAE5 over the different WIO port available
  if (!lorae5.begin(DSKLORAE5_SEARCH_WIO)) {
    Serial.println("LoRa E5 Init Failed");
    while (1)
      ;
  }

  // Setup the LoRaWan Credentials
  if (!lorae5.setup(
        Frequency,  // LoRaWan Radio Zone EU868 here
        deveui,
        appeui,
        appkey)) {
    Serial.println("LoRa E5 Setup Failed");
    while (1)
      ;
  }
}

void loop() {
  delay(5000);
  static uint8_t data[] = { 0x01, 0x02, 0x03, 0x04 };

  if (lorae5.send_sync(
        1,             // LoRaWan Port
        data,          // data array
        sizeof(data),  // size of the data
        false,         // we are not expecting a ack
        7,             // Spread Factor
        14             // Tx Power in dBm
        )) {
    Serial.println("Uplink done");
    if (lorae5.isDownlinkReceived()) {
      Serial.println("A downlink has been received");
      if (lorae5.isDownlinkPending()) {
        Serial.println("More downlink are pending");
      }
    }
  }
}