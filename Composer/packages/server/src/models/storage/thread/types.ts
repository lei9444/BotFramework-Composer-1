// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.

export type WritePayload = {
  type: 'write';
  path: string;
  content: any;
};

export type ReadPayload = {
  type: 'read';

  path: string;
};

export type RequestMsg = {
  id: string;
  payload: WritePayload | ReadPayload;
};

export type ResponseMsg = {
  id: string;
  error?: any;
  payload?: any;
};
