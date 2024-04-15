# IntelliZon

Projet de M2 à l'[École Hexagone](https://www.ecole-hexagone.com/).

![Infrastructure du projet](Infra_IoT_LoRaWAN.drawio.png)

## 1. Prérequis
Les dépendances suivantes doivent être installées sur le poste :
* Docker
* NPM (NodeJS)
* Arduino IDE

## 2. Installation et démarrage
### A. Base MongoDB (avec Docker)
* Démarrez une instance Docker de MongoDB en exécutant [run_mongo_docker.bat](run_mongo_docker.bat).
* Par défaut l'utilisateur et le mot de passe sont `admin`.

### B. Serveur HTTP ExpressJS
* Installez les dépendances NPM :
    ```sh
    cd ./express
    npm i
    ```
* Générez deux clés API, par exemple avec https://it-tools.tech/token-generator?length=50.
* Ajoutez un fichier `.env` dans [./express/](./express/) comme suit :
  ```
  HELIUM_IOT_API_KEY=<clé-api-générée-1>

  INTELLIZON_FRONT_API_KEY=<clé-api-généré-2>
  
  MONGO_DB_URL=mongodb://admin:admin@localhost:27017
  ```
  Ces clées seront nécessaires pour intégrer HTTP depuis la [Console Helium IoT](https://console.helium-iot.xyz/) de manière sécurisée, ainsi que pour sécuriser les requêtes depuis le Front.

  > Si vous avez modifié le mot de passe dans [run_mongo_docker.bat](run_mongo_docker.bat), il faut aussi le faire dans la constante `MONGO_DB_URL`.
* Exécutez [run_express_server.bat](run_express_server.bat) pour démarrer le serveur.

### C. Déploiement avec Ngrok
> Ce chapitre admet que vous ne déployez pas votre application sur un VPS en Cloud, et que vous avez besoin de Ngrok pour permettre à Helium IoT d'effectuer des requêtes API sur votre serveur. 

#### Installation :
* Téléchargez Ngrok : https://ngrok.com/download
* Dézippez et placez l'exécutable dans un dossier [./ngrok/](./ngrok/).
* Pour obtenir votre Auth Token, créez-vous un compte et accédez à https://dashboard.ngrok.com/get-started/your-authtoken.
* Ouvrez un terminal au niveau de [./ngrok/](./ngrok/) et configurez votre Auth Token sur votre poste :
  ```sh
  ngrok config add-authtoken <votre-auth-token-ngrok>
  ```

#### Démarrage mannuel d'une tunnel SSH :
* Vous pouvez démarrer un tunnel SSH avec la commande suivante :
    ```sh
    ngrok http http://localhost:<port>
    ```
    Ngrok va automatiquement créer une URL pour accéder à votre service.

    > Notez que l'URL générée utilise un certificat SSL auto-signé, d'où l'affichage d'un message de danger.

#### Exposition automatisée du serveur ExpressJS :
* Exposez rapidement votre serveur ExpressJS avec Ngrok sur le port `3000` en exécutant [run_express_ngrok.bat](run_express_ngrok.bat).

## 4. LoRaWAN avec Helium IoT
> Ce chapitre admet que vous avez un compte Helium IoT avec des tokens disponibles pour l'envoie de données en LoRaWAN. Plus d'informations dans le script [arduino/IntelliZon_LoRa_E5/IntelliZon_LoRa_E5.ino](arduino/IntelliZon_LoRa_E5/IntelliZon_LoRa_E5.ino) (et les URL qui y sont mises en commentaires).

### A. Codec de réception des messages
* Ouvrez la [Console Helium IoT](https://console.helium-iot.xyz/).
* Allez dans `Device profiles > (Profile souhaité) > Codec > Codec functions`.
* Saisissez le script suivant afin de décoder le flux de données LoRaWAN :
  ```js
  // Decode uplink function.
  //
  // Input is an object with the following fields:
  // - bytes = Byte array containing the uplink payload, e.g. [255, 230, 255, 0]
  // - fPort = Uplink fPort.
  // - variables = Object containing the configured device variables.
  //
  // Output must be an object with the following fields:
  // - data = Object representing the decoded payload.

  function decodeUplink(input) {
    let bytes = input.bytes;
    let port = input.fPort;
    let decoded = {};

    if ((port === 1) || (port === 8)) {
      decoded.temp = bytes[0] << 8 | bytes[1];
      decoded.humidity = bytes[2] << 8 | bytes[3];
      decoded.light = bytes[4] << 8 | bytes[5];
      return { data: decoded };
    }
    return null;
  }
  
  // Encode downlink function.
  //
  // Input is an object with the following fields:
  // - data = Object representing the payload that must be encoded.
  // - variables = Object containing the configured device variables.
  //
  // Output must be an object with the following fields:
  // - bytes = Byte array containing the downlink payload.
  function encodeDownlink(input) {
    return {
      bytes: [225, 230, 255, 0]
    };
  }
  ```
* Validez avec `Submit`.

### B. Intégration HTTP
* Ouvrez la [Console Helium IoT](https://console.helium-iot.xyz/).
* Allez dans `Application > (Application souhaitée) > Integrations > HTTP`.
* Définissez les paramètres de la façon suivante :
  * Payload encoding : `JSON`
  * Event endpoint URL(s) : `https://<domaine-exposé-avec-ngrok>/api/helium/saveData`
  * Headers :
    * `Authorization` : `<la-clé-api-générée-pour-helium-iot>`

Helium IoT peut désormais utiliser l'API de votre serveur ExpressJS pour enregistrer les données envoyées par vos capteurs.