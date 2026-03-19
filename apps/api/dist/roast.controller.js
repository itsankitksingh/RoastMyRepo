"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.RoastController = void 0;
const common_1 = require("@nestjs/common");
const roast_service_1 = require("./roast.service");
let RoastController = class RoastController {
    roastService;
    constructor(roastService) {
        this.roastService = roastService;
    }
    async roast(body) {
        return this.roastService.roast({
            username: body.username?.trim() || '',
            accessToken: body.accessToken,
        });
    }
};
exports.RoastController = RoastController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], RoastController.prototype, "roast", null);
exports.RoastController = RoastController = __decorate([
    (0, common_1.Controller)('api/roast'),
    __metadata("design:paramtypes", [roast_service_1.RoastService])
], RoastController);
//# sourceMappingURL=roast.controller.js.map