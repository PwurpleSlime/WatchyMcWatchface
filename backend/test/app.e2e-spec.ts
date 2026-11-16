import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import speakeasy from 'speakeasy';
import { AppModule } from './../src/app.module';

describe('AppController (e2e)', () => {
  let app: INestApplication<App>;
  const secret = 'JBSWY3DPEHPK3PXP';
  const originalSecret = process.env.SPEAKEASY_SECRET;

  beforeEach(async () => {
    process.env.SPEAKEASY_SECRET = secret;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    if (originalSecret === undefined) {
      delete process.env.SPEAKEASY_SECRET;
    } else {
      process.env.SPEAKEASY_SECRET = originalSecret;
    }
  });

  it('/ (GET)', () => {
    return request(app.getHttpServer())
      .get('/')
      .expect(200)
      .expect('Hello World!');
  });

  it('allows GET routes without a two-factor code', () => {
    return request(app.getHttpServer()).get('/searchForItem').expect(400);
  });

  it('requires a two-factor code for non-GET routes', () => {
    return request(app.getHttpServer())
      .post('/items')
      .send({ name: 'test' })
      .expect(401);
  });

  it('passes a valid code through the middleware', () => {
    return request(app.getHttpServer())
      .post('/items')
      .set('x-2fa-code', speakeasy.totp({ secret, encoding: 'base32' }))
      .send({})
      .expect(400);
  });

  it('accepts a valid TOTP as a bearer token', () => {
    return request(app.getHttpServer())
      .post('/items')
      .set(
        'Authorization',
        `Bearer ${speakeasy.totp({ secret, encoding: 'base32' })}`,
      )
      .send({})
      .expect(400);
  });

  it('publicly verifies a valid Speakeasy code', () => {
    return request(app.getHttpServer())
      .post('/auth/verify-2fa')
      .send({ code: speakeasy.totp({ secret, encoding: 'base32' }) })
      .expect(201)
      .expect({ verified: true });
  });

  it('rejects an invalid code on the public verification route', () => {
    return request(app.getHttpServer())
      .post('/auth/verify-2fa')
      .send({ code: 'not-a-code' })
      .expect(401);
  });

  it('fails closed when the Speakeasy secret is not configured', async () => {
    delete process.env.SPEAKEASY_SECRET;

    await request(app.getHttpServer())
      .post('/items')
      .send({ name: 'test' })
      .expect(503);
  });
});
