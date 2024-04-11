# IntelliZon

Projet de M2 à l'[École Hexagone](https://www.ecole-hexagone.com/).

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
  Ces clées seront nécessaires pour intégrer HTTP depuis la [Console Helium IoT](https://console.helium-iot.xyz/) de manière sécurisée, ainsi que pour sécuriser le requêtes `GET` depuis le Front.

  > Si vous avez modifié le mot de passe dans [run_mongo_docker.bat](run_mongo_docker.bat), il faut aussi le faire dans la constante `MONGO_DB_URL`.
* Exécutez [run_express_server.bat](run_express_server.bat) pour démarrer le serveur.

### C. Déploiement avec Ngrok

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

## 4. Intégration avec Helium IoT
* Ouvrez la [Console Helium IoT](https://console.helium-iot.xyz/)
* Aller dans `Application > Integration > HTTP`
* Définir les paramètres de la façon suivante :
  * Payload encoding : `JSON`
  * Event endpoint URL(s) : `https://<domaine-exposé-avec-ngrok>/api/helium`
  * Headers :
    * Authorization : `<la-clé-api-générée-pour-expressjs>`