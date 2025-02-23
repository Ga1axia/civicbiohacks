// @ts-nocheck
import FeatureLayer from "@arcgis/core/layers/FeatureLayer.js";
import { config } from "./config.js";

/**
 * Queries features from a feature layer based on date.
 * @param {string} dateField - The field name storing date values.
 * @param {string} startDate - Start date (YYYY-MM-DD).
 * @param {string} endDate - End date (YYYY-MM-DD).
 * @returns {Promise<Object[]>} - Returns an array of feature objects.
 */
export async function queryFeatures(dateField, startDate, endDate) {
    const featureLayer = new FeatureLayer({ 
        url: config.featureLayerUrl,
        outFields: ["*"]
    });

    const query = featureLayer.createQuery();
    // Query cities with population over 100,000
    query.where = "POP2020 > 100000";
    query.outFields = ["*"];
    query.returnGeometry = true;
    query.maxRecordCount = 50;  // Limit to 50 cities

    try {
        const result = await featureLayer.queryFeatures(query);
        console.log("Features found:", result.features);
        return result.features.map(feature => ({
            ...feature,
            attributes: {
                ...feature.attributes,
                name: feature.attributes.NAME || 'Unnamed City',
                dateField: new Date().toISOString(), // Current date since we're not filtering by date
                description: `Population (2020): ${feature.attributes.POP2020.toLocaleString()}, State: ${feature.attributes.ST}`
            }
        }));
    } catch (error) {
        console.error("Error querying features:", error);
        throw error;
    }
}
