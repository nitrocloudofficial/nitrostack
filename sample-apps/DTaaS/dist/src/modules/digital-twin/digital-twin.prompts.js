var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { PromptDecorator as Prompt } from "@nitrostack/core";
export class DigitalTwinPrompts {
    async getSmartHomePrompt(args, ctx) {
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Home".

Create the following devices:
- 2 Smart Lights
- 1 Smart Plug
- 1 CCTV Camera
- 1 Smart Meter

Create three dashboards:
- Home Overview
- Energy Monitoring
- Security Dashboard

Create one customer named "HomeOwner".

Create two users under this customer:
- homeadmin@example.com (Tenant Administrator)
- resident@example.com (Customer User)

Create a rule chain named "Home Automation".

Create two alarms:
- High Energy Usage (CRITICAL)
- Camera Offline (MAJOR)`
            }
        ];
    }
    async getSmartFactoryPrompt(args, ctx) {
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Factory".

Create the following devices:
- 2 Temperature Sensors
- 1 Conveyor Motor
- 1 PLC Controller
- 1 Power Meter

Create three dashboards:
- Factory Overview
- Production Dashboard
- Machine Health

Create one customer named "Factory Operations".

Create two users:
- manager@factory.com (Tenant Administrator)
- operator@factory.com (Customer User)

Create a rule chain named "Factory Monitoring".

Create two alarms:
- Machine Overheating (CRITICAL)
- Power Failure (MAJOR)`
            }
        ];
    }
    async getSmartHospitalPrompt(args, ctx) {
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Hospital".

Create the following devices:
- 1 ICU Monitor
- 1 Ventilator
- 1 Smart Bed
- 1 Nurse Station
- 1 Power Meter

Create three dashboards:
- ICU Dashboard
- Patient Monitoring
- Hospital Utilities

Create one customer named "City Hospital".

Create two users:
- admin@hospital.com (Tenant Administrator)
- nurse@hospital.com (Customer User)

Create a rule chain named "Hospital Monitoring".

Create two alarms:
- Patient Emergency (CRITICAL)
- Device Offline (WARNING)`
            }
        ];
    }
    async getSmartWarehousePrompt(args, ctx) {
        return [
            {
                role: "user",
                content: `Create a digital twin named "Smart Warehouse".

Create the following devices:
- 1 RFID Reader
- 1 Temperature Sensor
- 1 Door Sensor
- 1 CCTV Camera
- 1 Smart Light

Create three dashboards:
- Warehouse Overview
- Inventory Monitoring
- Security Dashboard

Create one customer named "Warehouse Logistics".

Create two users:
- admin@warehouse.com (Tenant Administrator)
- supervisor@warehouse.com (Customer User)

Create a rule chain named "Warehouse Automation".

Create two alarms:
- Unauthorized Door Access (CRITICAL)
- High Temperature (MAJOR)`
            }
        ];
    }
}
__decorate([
    Prompt({
        name: "smart_home",
        description: "Creates a complete Smart Home digital twin with smart devices, dashboards, users, automation rule chains, and alarms.",
        arguments: []
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinPrompts.prototype, "getSmartHomePrompt", null);
__decorate([
    Prompt({
        name: "smart_factory",
        description: "Creates a complete Smart Factory digital twin with industrial devices, production dashboards, monitoring rule chains, and factory alarms.",
        arguments: []
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinPrompts.prototype, "getSmartFactoryPrompt", null);
__decorate([
    Prompt({
        name: "smart_hospital",
        description: "Creates a complete Smart Hospital digital twin with ICU devices, patient monitoring dashboards, hospital staff users, monitoring rule chains, and clinical alarms.",
        arguments: []
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinPrompts.prototype, "getSmartHospitalPrompt", null);
__decorate([
    Prompt({
        name: "smart_warehouse",
        description: "Creates a complete Smart Warehouse digital twin with RFID, environmental sensors, security devices, logistics dashboards, automation rule chains, and security alarms.",
        arguments: []
    }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], DigitalTwinPrompts.prototype, "getSmartWarehousePrompt", null);
//# sourceMappingURL=digital-twin.prompts.js.map