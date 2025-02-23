// @ts-nocheck
import esriConfig from "@arcgis/core/config";
import IdentityManager from "@arcgis/core/identity/IdentityManager";
import OAuthInfo from "@arcgis/core/identity/OAuthInfo";

// Configure CORS for ArcGIS requests
esriConfig.request.useIdentity = true;
esriConfig.request.timeout = 30000;

// Set up OAuth authentication
const clientId = import.meta.env.VITE_ARCGIS_CLIENT_ID;
const clientSecret = import.meta.env.VITE_ARCGIS_CLIENT_SECRET;

if (!clientId || !clientSecret) {
    throw new Error("ArcGIS credentials not found. Make sure VITE_ARCGIS_CLIENT_ID and VITE_ARCGIS_CLIENT_SECRET are set in your .env file");
}

const info = new OAuthInfo({
    appId: clientId,
    popup: false,
    portalUrl: "https://www.arcgis.com",
    flowType: "auto",
    pkce: true,
    expiration: 20160, // 2 weeks
});

// Register the authentication details
IdentityManager.registerOAuthInfos([info]);

// Function to get token using client credentials
async function getClientCredentialsToken() {
    try {
        const response = await fetch('https://www.arcgis.com/sharing/rest/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                grant_type: 'client_credentials',
                f: 'json'
            })
        });

        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }

        return data;
    } catch (error) {
        console.error('Error getting token:', error);
        throw error;
    }
}

// Initialize authentication
export async function initializeAuth() {
    try {
        // First try to use stored credentials
        try {
            await IdentityManager.checkSignInStatus(info.portalUrl + "/sharing");
            return true;
        } catch {
            // No stored credentials, try client credentials
            console.log("No stored credentials, trying client credentials...");
        }

        // Get token using client credentials
        const tokenInfo = await getClientCredentialsToken();
        
        // Create a credential object
        const credential = {
            expires: tokenInfo.expires_in * 1000 + Date.now(),
            server: info.portalUrl + "/sharing/rest",
            ssl: true,
            token: tokenInfo.access_token,
            userId: clientId
        };

        // Register the credential
        IdentityManager.registerToken(credential);
        
        return true;
    } catch (error) {
        console.error('Authentication failed:', error);
        return false;
    }
}

export const config = {
    arcgisLocatorUrl: "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer"
};
