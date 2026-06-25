import { NestFactory } from '@nestjs/core';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function generateOpenApi() {
  const app = await NestFactory.create(AppModule, { logger: false });

  try {
    const document = configureApp(app);
    const serializedDocument = `${JSON.stringify(document, null, 2)}\n`;
    const outputPath = resolve(process.cwd(), 'openapi.json');

    if (process.argv.includes('--check')) {
      const committedDocument = await readFile(outputPath, 'utf8');

      if (committedDocument !== serializedDocument) {
        throw new Error('openapi.json is out of date. Run npm run contract:generate.');
      }
    } else {
      await writeFile(outputPath, serializedDocument, 'utf8');
    }
  } finally {
    await app.close();
  }
}

void generateOpenApi();
