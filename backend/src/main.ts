import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

    // 1. Configure Swagger options
  const config = new DocumentBuilder()
    .setTitle('My API Title')
    .setDescription('The API description')
    .setVersion('1.0')
    .addBearerAuth() 
    .build();

  const document = SwaggerModule.createDocument(app, config);

    SwaggerModule.setup('/api-docs', app, document, {
    customSiteTitle: 'WatchyMcWatchFace API Docs',
    swaggerOptions: {
      url: '/api-docs-json', 
      docExpansion: 'All',
      persistAuthorization: false,
      tagsSorter: 'alpha',
      operationsSorter: (a, b) => {
        const order = { get: 1, post: 2, put: 3, patch: 4, delete: 5 }

        return order[a.get('method')] - order[b.get('method')]
      },
    },
    customCssUrl: 'https://unpkg.com/swagger-ui-dist/swagger-ui.css',
    customJs: [
      'https://unpkg.com/swagger-ui-dist/swagger-ui-bundle.js',
      'https://unpkg.com/swagger-ui-dist/swagger-ui-standalone-preset.js',
    ],
  });
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
