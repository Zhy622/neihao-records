import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

const RECORD_REFLECTION_TYPE = 'record_reflection';
const RECORD_REFLECTION_PROMPT_VERSION = 'record_reflection_v3';
const AI_PROVIDER = 'zhipu';
const model = process.env.ZHIPU_MODEL ?? 'glm-4-flash';

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
            type: RECORD_REFLECTION_TYPE,
            promptVersion: RECORD_REFLECTION_PROMPT_VERSION,
            },
            orderBy: {
            createdAt: 'desc',
            },
        });

        if (existingInsight && isRecordInsightResult(existingInsight.resultJson)) {
            return {
                id: existingInsight.id,
                recordId,
                type: existingInsight.type,
                provider: existingInsight.provider,
                model: existingInsight.model,
                promptVersion: existingInsight.promptVersion,
                result: existingInsight.resultJson,
                createdAt: existingInsight.createdAt.toISOString(),
            };
        }
        
        try {
            const completion = await this.openai.chat.completions.create({
                model: model,
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
                    '你是AI复盘助手，帮助用户看清一次纠结内耗，而不是替用户做决定。',
                    '你的语气要安静、克制、具体，像一个清醒但不评判的陪伴者。',
                    '',
                    '复盘目标：',
                    '1. 先承认这次纠结背后有合理的在意点，不责备用户。',
                    '2. 从记录中提炼“真正拉扯的两种需要/担心/价值”。',
                    '3. 不做心理诊断，不说教，不使用鸡汤、夸张、命令式表达。',
                    '4. 输出要具体，避免“放轻松、相信自己、好好沟通”这类空泛建议。',
                    '',
                    '输出要求：',
                    '- 只返回合法 JSON，不要 Markdown，不要代码块，不要额外解释。',
                    '- 每个字段都必须是中文字符串。',
                    '- 如果记录信息不足，也要基于已有信息谨慎推断，并用“可能”表达。',
                    '- summary：40 字以内，概括这次纠结和事后是否值得。',
                    '- coreConflict：指出两股拉扯，例如“想要稳定”和“害怕错过机会”。',
                    '- gentleQuestion：必须是一个问句，帮助用户下次更早看见自己的真实在意。',
                    '- nextAction：必须是一个今天 10 分钟内能完成的小动作，具体到行为。',
                    '',
                    '返回 JSON 格式：',
                    '{',
                    '  "summary": "这次纠结的简短概括",',
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

            let parsed: unknown;

            try {
                parsed = JSON.parse(content);
            } catch {
                throw new Error('AI returned invalid JSON');
            }

            if (!isRecordInsightResult(parsed)) {
                throw new Error('AI returned unexpected result shape');
            }

            const result = parsed;

            const insight = await this.prisma.aiInsight.create({
                data: {
                    userId,
                    recordId,
                    type: RECORD_REFLECTION_TYPE,
                    provider: AI_PROVIDER,
                    model: model,
                    promptVersion: RECORD_REFLECTION_PROMPT_VERSION,
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
            type: RECORD_REFLECTION_TYPE
            },
            orderBy: {
            createdAt: 'desc',
            },
        });
    }

    
}

function isRecordInsightResult(value: unknown): value is RecordInsightResult {
    if (!value || typeof value !== 'object') {
        return false;
    }

    const result = value as Partial<RecordInsightResult>;

    return (
        typeof result.summary === 'string' &&
        typeof result.coreConflict === 'string' &&
        typeof result.gentleQuestion === 'string' &&
        typeof result.nextAction === 'string'
    );
}
