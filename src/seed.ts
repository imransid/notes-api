import {
  ConflictException,
  INestApplicationContext,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { NotesService } from './notes/notes.service.js';
import { PostsService } from './posts/posts.service.js';
import { UsersService } from './users/users.service.js';

const DEMO_PASSWORD = 'Password123';
const DEMO_USERS = [
  { name: 'Alice', interests: ['music', 'hiking', 'photography'] },
  { name: 'Bob', interests: ['music', 'gaming'] },
  { name: 'Carol', interests: ['hiking', 'cooking', 'music'] },
  { name: 'Dave', interests: ['gaming', 'photography'] },
  { name: 'Erin', interests: ['cooking', 'hiking', 'reading'] },
];

const logger = new Logger('Seed');

async function seed(app: INestApplicationContext) {
  const config = app.get(ConfigService);
  const users = app.get(UsersService);
  const notes = app.get(NotesService);
  const posts = app.get(PostsService);

  // The unique email index tells us whether we already seeded; no data is ever removed.
  try {
    await users.create({
      name: 'Admin',
      email: config.getOrThrow<string>('ADMIN_EMAIL'),
      password: config.getOrThrow<string>('ADMIN_PASSWORD'),
      role: 'admin',
    });
  } catch (err) {
    if (!(err instanceof ConflictException)) throw err;
    logger.log('Admin already exists, nothing changed');
    return;
  }

  for (const { name, interests } of DEMO_USERS) {
    const user = await users.create({
      name,
      email: `${name.toLowerCase()}@example.com`,
      password: DEMO_PASSWORD,
      interests,
    });
    const id = user._id.toString();

    for (const title of ['Groceries', 'Ideas', 'To do']) {
      await notes.create(id, { title, content: `${name}'s ${title}` });
    }
    for (const interest of interests.slice(0, 2)) {
      await posts.create(id, {
        title: `${name} on ${interest}`,
        body: `Why ${name} likes ${interest}.`,
      });
    }
  }
  logger.log(`Created the admin and ${DEMO_USERS.length} demo users`);
}

const app = await NestFactory.createApplicationContext(AppModule);
await seed(app).finally(() => app.close());
