import { addressToLocations } from "@arcgis/core/rest/locator.js";
import { config } from "./config.js";

/**
 * Searches for a location using the ArcGIS API.
 * @param {string} address - Address to search.
 * @returns {Promise<{lat: number, lng: number} | null>}
 */
export async function searchLocation(address) {
    const params = { address: { SingleLine: address } };

    try {
        const results = await addressToLocations(config.arcgisLocatorUrl, params);
        if (results.length > 0) {
            // @ts-ignore
            const { y: lat, x: lng } = results[0].location;
            console.log(`Found: ${lat}, ${lng}`);
            return { lat, lng };
        } else {
            console.log("No results found.");
            return null;
        }
    } catch (error) {
        console.error("Error searching location:", error);
        return null;
    }
}
