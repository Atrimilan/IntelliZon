/*
 * Exemple de récupération des valeurs de température et d'humidité, et affichage dans le Serial Monitor d'Arduino IDE.
 * -> Ce script se base sur les documentations citées dans le script IntelliZon_LoRa_E5.ino
 */
 
#include <Arduino.h>
#include <SensirionI2CSht4x.h>
#include <Wire.h>
#include <array>

std::array<uint8_t, 4> floatToUint8_v2(float value1, float value2);

SensirionI2CSht4x sht4x;

void setup() {

  Serial.begin(115200);
  while (!Serial) {
    delay(100);
  }

  Wire.begin();

  uint16_t error;
  char errorMessage[256];

  sht4x.begin(Wire, 0x44);

  uint32_t serialNumber;
  error = sht4x.serialNumber(serialNumber);
  if (error) {
    Serial.print("Error trying to execute serialNumber(): ");
    errorToString(error, errorMessage, 256);
    Serial.println(errorMessage);
  } else {
    Serial.print("Serial Number: ");
    Serial.println(serialNumber);
  }
}

void loop() {
  uint16_t error;
  char errorMessage[256];

  delay(1000);

  float temperature;
  float humidity;
  error = sht4x.measureHighPrecision(temperature, humidity);
  if (error) {
    Serial.print("Error trying to execute measureHighPrecision(): ");
    errorToString(error, errorMessage, 256);
    Serial.println(errorMessage);
  } else {
    Serial.print("Temperature:");
    Serial.print(temperature);
    Serial.print("\tHumidity:");
    Serial.println(humidity);

    std::array<uint8_t, 4> data = floatToUint8_v2(temperature, humidity);

    printData(data);
  }
}

std::array<uint8_t, 4> floatToUint8_v2(float value1, float value2) {
  // Séparation des parties entières et décimales pour les deux valeurs
  float intPart1 = static_cast<float>(static_cast<int>(value1));
  float decPart1 = value1 - intPart1;

  float intPart2 = static_cast<float>(static_cast<int>(value2));
  float decPart2 = value2 - intPart2;

  // Conversion en uint8_t
  uint8_t intPart1Uint = static_cast<uint8_t>(intPart1);
  uint8_t decPart1Uint = static_cast<uint8_t>(decPart1 * 100);  // Convertir la partie décimale en centièmes

  uint8_t intPart2Uint = static_cast<uint8_t>(intPart2);
  uint8_t decPart2Uint = static_cast<uint8_t>(decPart2 * 100);  // Convertir la partie décimale en centièmes

  // Création du tableau uint8_t avec les valeurs converties
  std::array<uint8_t, 4> data = { intPart1Uint, decPart1Uint, intPart2Uint, decPart2Uint };

  return data;
}

void printData(std::array<uint8_t, 4> data) {
    Serial.print("Data: ");
    for (const auto &value : data) {
      Serial.print(value, HEX);
      Serial.print(", ");
    }
    Serial.println();
}