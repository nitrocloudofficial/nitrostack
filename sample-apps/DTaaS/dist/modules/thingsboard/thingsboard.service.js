import axios from "axios";
import * as dotenv from "dotenv";
dotenv.config();
export class ThingsBoardService {
    TB_URL = process.env.TB_URL;
    API_KEY = process.env.TB_API_KEY;
    headers = {
        "Content-Type": "application/json",
        "X-Authorization": `ApiKey ${this.API_KEY}`
    };
    // --- Device Operations ---
    async createDevice(deviceName, deviceType, label) {
        const response = await axios.post(`${this.TB_URL}/api/device`, { name: deviceName, type: deviceType, label: label ?? deviceType }, { headers: this.headers });
        return response.data;
    }
    // --- Alarm Methods ---
    async saveAlarm(alarmData) {
        const response = await axios.post(`${this.TB_URL}/api/alarm`, alarmData, { headers: this.headers });
        return response.data;
    }
    async deleteAlarm(alarmId) {
        const response = await axios.delete(`${this.TB_URL}/api/alarm/${alarmId}`, { headers: this.headers });
        return response.data || { status: "OK", id: alarmId };
    }
    async ackAlarm(alarmId) {
        const response = await axios.post(`${this.TB_URL}/api/alarm/${alarmId}/ack`, {}, { headers: this.headers });
        return response.data || { status: "OK", id: alarmId };
    }
    // ---------- ASSET METHODS ----------
    async createAsset(assetName, assetType, label) {
        const response = await axios.post(`${this.TB_URL}/api/asset`, {
            name: assetName,
            type: assetType,
            label: label ?? assetType
        }, { headers: this.headers });
        return response.data;
    }
    async clearAlarm(alarmId) {
        const response = await axios.post(`${this.TB_URL}/api/alarm/${alarmId}/clear`, {}, { headers: this.headers });
        return response.data || { status: "OK", id: alarmId };
    }
    async getAlarmInfoById(alarmId) {
        const response = await axios.get(`${this.TB_URL}/api/alarm/info/${alarmId}`, { headers: this.headers });
        return response.data;
    }
    async getDeviceByName(deviceName) {
        const response = await axios.get(`${this.TB_URL}/api/tenant/devices`, { headers: this.headers, params: { deviceName } });
        return response.data;
    }
    async deleteDevice(deviceId) {
        const response = await axios.delete(`${this.TB_URL}/api/device/${deviceId}`, { headers: this.headers });
        return response.data;
    }
    // --- Customer Operations ---
    async createCustomer(title, email, phone, address, city, country) {
        const response = await axios.post(`${this.TB_URL}/api/customer`, { title, email, phone, address, city, country }, { headers: this.headers });
        return response.data;
    }
    async getCustomerByTitle(customerTitle) {
        const response = await axios.get(`${this.TB_URL}/api/tenant/customers`, { headers: this.headers, params: { customerTitle } });
        return response.data;
    }
    async deleteCustomer(customerId) {
        const response = await axios.delete(`${this.TB_URL}/api/customer/${customerId}`, { headers: this.headers });
        return response.data;
    }
    async getAlarms(entityType, entityId, params) {
        const response = await axios.get(`${this.TB_URL}/api/alarm/${entityType}/${entityId}`, { headers: this.headers, params });
        return response.data;
    }
    async getAllAlarms(params) {
        const response = await axios.get(`${this.TB_URL}/api/alarms`, { headers: this.headers, params });
        return response.data;
    }
    async getHighestAlarmSeverity(entityType, entityId, params) {
        const response = await axios.get(`${this.TB_URL}/api/alarm/highestSeverity/${entityType}/${entityId}`, { headers: this.headers, params });
        return response.data;
    }
    async getAlarmTypes(params) {
        const response = await axios.get(`${this.TB_URL}/api/alarm/types`, { headers: this.headers, params });
        return response.data;
    }
    // --- Device Profile & Alarm Rule Methods ---
    async getDeviceProfileById(profileId) {
        const response = await axios.get(`${this.TB_URL}/api/deviceProfile/${profileId}`, { headers: this.headers });
        return response.data;
    }
    async getDeviceProfileByName(profileName) {
        const response = await axios.get(`${this.TB_URL}/api/deviceProfiles`, {
            headers: this.headers,
            params: { pageSize: 10, page: 0, textSearch: profileName }
        });
        return response.data;
    }
    async saveDeviceProfile(profileData) {
        const response = await axios.post(`${this.TB_URL}/api/deviceProfile`, profileData, { headers: this.headers });
        return response.data;
    }
    // Added: Creates a standalone alarm rule in ThingsBoard's "Actual" rules tab
    async createStandaloneAlarmRule(ruleData) {
        const response = await axios.post(`${this.TB_URL}/api/alarm/rule`, ruleData, { headers: this.headers });
        return response.data;
    }
    // --- User Management Methods ---
    async saveUser(userData, sendActivationMail = false) {
        const response = await axios.post(`${this.TB_URL}/api/user?sendActivationMail=${sendActivationMail}`, userData, { headers: this.headers });
        return response.data;
    }
    // --- Entity Group Operations ---
    async createEntityGroup(name, type) {
        const response = await axios.post(`${this.TB_URL}/api/entityGroup`, { name, type }, { headers: this.headers });
        return response.data;
    }
    async getUserById(userId) {
        const response = await axios.get(`${this.TB_URL}/api/user/${userId}`, { headers: this.headers });
        return response.data;
    }
    async getEntityGroupsByType(entityType) {
        // Fetch all entity groups for a specific type (e.g., 'DEVICE')
        const response = await axios.get(`${this.TB_URL}/api/entityGroups/${entityType}`, { headers: this.headers });
        return response.data;
    }
    async deleteEntityGroup(groupId) {
        const response = await axios.delete(`${this.TB_URL}/api/entityGroup/${groupId}`, { headers: this.headers });
        return response.data;
    }
    async deleteUser(userId) {
        const response = await axios.delete(`${this.TB_URL}/api/user/${userId}`, { headers: this.headers });
        return response.data || { status: "OK", id: userId };
    }
    async getTenantUsers(params) {
        const response = await axios.get(`${this.TB_URL}/api/tenant/users`, { headers: this.headers, params });
        return response.data;
    }
    /**
     * ThingsBoard's delete endpoint needs an assetId, not a name.
     * This resolves the name -> id first.
     */
    async getAssetByName(assetName) {
        const response = await axios.get(`${this.TB_URL}/api/tenant/assets`, {
            headers: this.headers,
            params: { assetName }
        });
        return response.data; // contains id.id
    }
    async deleteAsset(assetName) {
        const asset = await this.getAssetByName(assetName);
        if (!asset?.id?.id) {
            throw new Error(`Asset "${assetName}" not found.`);
        }
        const assetId = asset.id.id;
        const response = await axios.delete(`${this.TB_URL}/api/asset/${assetId}`, { headers: this.headers });
        return {
            deletedAssetId: assetId,
            status: response.status
        };
    }
    async getActivationLink(userId) {
        const response = await axios.get(`${this.TB_URL}/api/user/${userId}/activationLink`, {
            headers: this.headers,
            responseType: 'text'
        });
        return response.data;
    }
    // --- Emulator Methods ---
    /**
     * Searches or fetches device profile templates for emulator creation
     */
    async getEmulatorCatalog(pageSize = 100) {
        const response = await axios.get(`${this.TB_URL}/api/deviceProfiles`, {
            headers: this.headers,
            params: { pageSize, page: 0 }
        });
        return response.data;
    }
    /**
     * Provisions an emulator device entity in ThingsBoard
     */
    async createEmulatorDevice(deviceName, emulatorType = "smart-home-energy-hub", scenario = "Typical Day", telemetryRateSeconds = 5) {
        // Create standard device marked as EMULATOR in type/additionalInfo
        const deviceResponse = await axios.post(`${this.TB_URL}/api/device`, {
            name: deviceName,
            type: emulatorType,
            additionalInfo: {
                isEmulator: true,
                emulatorScenario: scenario,
                telemetryRate: telemetryRateSeconds
            }
        }, { headers: this.headers });
        return {
            device: deviceResponse.data,
            emulatorType,
            scenario,
            telemetryRateSeconds,
            status: "RUNNING"
        };
    }
    async addEntitiesToGroup(groupId, entityIds) {
        const response = await axios.post(`${this.TB_URL}/api/entityGroup/${groupId}/addEntities`, entityIds, { headers: this.headers });
        return response.data;
    }
    async removeEntitiesFromGroup(groupId, entityIds) {
        // FIX: The correct ThingsBoard endpoint for removing entities ends in /deleteEntities, not /removeEntities
        const response = await axios.post(`${this.TB_URL}/api/entityGroup/${groupId}/deleteEntities`, entityIds, { headers: this.headers });
        return response.data;
    }
}
//# sourceMappingURL=thingsboard.service.js.map