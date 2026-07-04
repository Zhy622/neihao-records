import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { CreateRecordInsightDto} from './dto/create-record-insight.dto';
import { PrismaService } from '../prisma/prisma.service';


export type RecordInsightResult = {
  summary: string;
  coreConflict: string;
  gentleQuestion: string;
  nextAction: string;
};

export type RecordInsightResponse = {
  id: string;
  recordId: string;
  type: string;
  provider: string;
  model: string;
  promptVersion: string;
  result: RecordInsightResult;
  createdAt: string;
};



@Injectable()
export class AiService {
    private readonly openai = new OpenAI({
        apiKey: process.env.ZHIPU_API_KEY,
        baseURL: process.env.ZHIPU_BASE_URL ?? 'https://open.bigmodel.cn/api/paas/v4/',
    });

    constructor(private readonly prisma: PrismaService){}

    private async ensureOwnedRecord(userId: string, recordId: string) {
        const record = await this.prisma.record.findFirst({
        where: {
                id: recordId,
                userId,
                deletedAt: null,
            },
        });

        if (!record) {
            throw new NotFoundException('Record not found.');
        }

        return record;
    }

    async  createRecordInsightByRecordId(
        userId: string,  
        recordId: string,     
    ): Promise<RecordInsightResponse> {
        const record = await this.ensureOwnedRecord(userId, recordId);

        if (!process.env.ZHIPU_API_KEY) {
            throw new InternalServerErrorException('ZHIPU_API_KEY is not configured');
        }
        
         // 2. 查缓存：有没有已经生成过的 AI 复盘
        const existingInsight = await this.prisma.aiInsight.findFirst({
            where: {
            userId,
            recordId,
            type: 'record_reflection',
            promptVersion: 'record_reflection_v1',
            },
            orderBy: {
            createdAt: 'desc',
            },
        });

        if (existingInsight) {
            return {
            id: existingInsight.id,
            recordId,
            type: existingInsight.type,
            provider: existingInsight.provider,
            model: existingInsight.model,
            promptVersion: existingInsight.promptVersion,
            result: existingInsight.resultJson as RecordInsightResult,
            createdAt: existingInsight.createdAt.toISOString(),
            };
        }
        
        try {
            const completion = await this.openai.chat.completions.create({
                model: process.env.ZHIPU_MODEL ?? 'glm-4-flash',
                temperature: 0.4,
                top_p: 0.8,
                max_tokens: 400,
                response_format: {
                type: 'json_object',
                },
                messages: [
                {
                    role: 'system',
                    content: [
                    '你是一个温和克制的自我复盘助手。',
                    '基于用户记录，输出客观、非评判的复盘建议。',
                    '不要医学诊断，不要鸡汤，不要夸张表达。',
                    '只返回JSON：',
                    '{',
                    '  "summary": "对这次纠结的简短概括，记住：用户事后看选的是值得纠结还是不值得纠结",',
                    '  "coreConflict": "这次纠结背后的核心拉扯",',
                    '  "gentleQuestion": "一个温和但有启发的问题",',
                    '  "nextAction": "一个今天就能做的小行动"',
                    '}',
                    ].join('\n'),
                },
                {
                    role: 'user',
                    content: JSON.stringify({
                        title: record.title,
                        category: record.category,
                        emotions: record.emotions,
                        emotionIntensity: record.emotionIntensity,
                        decisionDifficulty: record.decisionDifficulty,
                        timeCost: record.timeCost,
                        thoughts: record.thoughts,
                        finalDecision: record.finalDecision,
                        worthIt: record.worthIt,
                        createdAt: record.createdAt,
                    }),
                },
                ],
            });

            const content = completion.choices[0]?.message?.content;

            if (!content) {
                throw new Error('Empty AI response');
            }

            const result =  JSON.parse(content) as RecordInsightResult;

            const insight = await this.prisma.aiInsight.create({
                data: {
                    userId,
                    recordId,
                    type: 'record_reflection',
                    provider: 'zhipu',
                    model: process.env.ZHIPU_MODEL ?? 'glm-4.7',
                    promptVersion: 'record_reflection_v1',
                    resultJson: result,
                }
            })

            return {
                id: insight.id,
                recordId,
                type: insight.type,
                provider: insight.provider,
                model: insight.model,
                promptVersion: insight.promptVersion,
                result,
                createdAt: insight.createdAt.toISOString(),
            };
        } catch (error){
            console.error('Create record insight failed:', error);
            throw new InternalServerErrorException('AI 复盘生成失败');
        }
    }

    async listRecordInsights(userId: string, recordId: string) {
        await this.ensureOwnedRecord(userId, recordId);

        return this.prisma.aiInsight.findMany({
            where: {
            userId,
            recordId,
            type: 'record_reflection',
            },
            orderBy: {
            createdAt: 'desc',
            },
        });
    }
}

