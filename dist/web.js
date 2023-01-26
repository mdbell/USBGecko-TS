"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const serialport_binding_webserialapi_1 = __importDefault(require("serialport-binding-webserialapi"));
serialport_binding_webserialapi_1.default.list().then(info => {
    console.log(info);
});
//# sourceMappingURL=web.js.map