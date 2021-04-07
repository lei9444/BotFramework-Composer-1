// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import fs from 'fs';
import { fork, ChildProcess } from 'child_process';
import path from 'path';

import uniqueId from 'lodash/uniqueId';

import { ResponseMsg } from './types';

class FileManager {
  private static _worker: ChildProcess;
  private resolves = {};
  private rejects = {};

  constructor() {
    FileManager.worker.on('message', this.handleMsg.bind(this));
  }

  async readFile(path: string): Promise<string> {
    const msgId = uniqueId();
    const msg = { id: msgId, payload: { type: 'read', path } };
    return new Promise((resolve, reject) => {
      this.resolves[msgId] = resolve;
      this.rejects[msgId] = reject;
      FileManager.worker.send(msg);
    });
  }

  async writeFile(path: string, content: any): Promise<void> {
    const msgId = uniqueId();
    const msg = { id: msgId, payload: { type: 'write', path, content } };

    return new Promise((resolve, reject) => {
      this.resolves[msgId] = resolve;
      this.rejects[msgId] = reject;
      FileManager.worker.send(msg);
    });
  }

  // Handle incoming calculation result
  public handleMsg(msg: ResponseMsg) {
    const { id, error, payload } = msg;
    if (error) {
      const reject = this.rejects[id];
      if (reject) reject(error);
    } else {
      const resolve = this.resolves[id];
      if (resolve) resolve(payload);
    }

    // purge used callbacks
    delete this.resolves[id];
    delete this.rejects[id];
  }

  static get worker() {
    if (this._worker && !this._worker.killed) {
      return this._worker;
    }

    const workerScriptPath = path.join(__dirname, 'FileManagerWorker.ts');
    if (fs.existsSync(workerScriptPath)) {
      // set exec arguments to empty, avoid fork nodemon `--inspect` error
      this._worker = fork(workerScriptPath, [], {
        execArgv: ['-r', 'ts-node/register'],
        env: { TS_NODE_PROJECT: path.resolve(__dirname, '..', '..', '..', '..', 'tsconfig.json') },
      });
    } else {
      // set exec arguments to empty, avoid fork nodemon `--inspect` error
      this._worker = fork(path.join(__dirname, 'FileManagerWorker.js'), [], { execArgv: [] });
    }
    return this._worker;
  }
}

export const fileManager = new FileManager();
