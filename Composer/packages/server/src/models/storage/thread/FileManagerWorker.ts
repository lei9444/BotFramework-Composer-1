// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import fs from 'fs';
import { promisify } from 'util';

import { ReadPayload, RequestMsg, WritePayload } from './types';

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

const operators = {
  write: (data: any) => writeFile(data.path, data.content),
  read: async (data: any) => {
    const raw = await readFile(data.path, 'utf-8');
    return raw.replace(/^\uFEFF/, ''); // UTF-8 BOM: https://github.com/nodejs/node-v0.x-archive/issues/1918
  },
};

type TaskContent = WritePayload | ReadPayload;
const taskQueue: TaskContent[] = [];
const messageIds: string[] = [];
let isFlushing = false;

const flush = async () => {
  if (isFlushing) return;
  isFlushing = true;
  while (taskQueue.length) {
    const task = taskQueue.shift();
    const id = messageIds.shift();
    if (task) {
      try {
        const done = await operators[task.type](task);
        process.send?.({ id, payload: done });
      } catch (error) {
        process.send?.({ id, error: error ? { message: error.message, stack: error.stack } : undefined });
      }
    }
  }
  isFlushing = false;
};

const notify = (task: TaskContent, id: string) => {
  messageIds.push(id);
  taskQueue.push(task);
  flush();
};

process.on('message', async (msg: RequestMsg) => {
  notify(msg.payload, msg.id);
});
