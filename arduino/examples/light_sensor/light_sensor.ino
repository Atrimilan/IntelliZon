/*
 * Exemple de récupération des valeurs de luminosité, et affichage dans le Serial Monitor d'Arduino IDE.
 * -> Ce script provient de la documentation suivante : https://wiki.seeedstudio.com/K1100-Light-Sensor-Grove-LoRa-E5/
 *    Mais il n'envoie pas les informations en LoRaWan.
 */

void setup() {
  pinMode(WIO_LIGHT, INPUT);
  Serial.begin(115200);
}
 
void loop() {
   int light = analogRead(WIO_LIGHT);
   Serial.print("Light value: ");
   Serial.println(light);
   delay(200);
}