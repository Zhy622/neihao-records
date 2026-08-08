import { Param, Controller,  Post, Get, UseGuards } from '@nestjs/common';
import { AiService } from './ai.service';
import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AccessTokenPayload } from '../auth/auth.types';

@Controller('ai')
@UseGuards(JwtAuthGuard)
export class AiController {
    constructor(private readonly aiService: AiService) {}

    @Post('records/:recordId/insight')
    createRecordInsightByRecordId(
        @CurrentUser() user:AccessTokenPayload,
        @Param('recordId') recordId: string,
    ) {
        return this.aiService.createRecordInsightByRecordId(user.sub, recordId)
    }

    @Get('records/:recordId/insights')
    listRecordInsights(
        @CurrentUser() user:AccessTokenPayload,
         @Param('recordId') recordId: string,
    ){
        return this.aiService.listRecordInsights(user.sub, recordId);
    }
}
