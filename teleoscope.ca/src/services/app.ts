// Need to use the React-specific entry point to import createApi
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { Workflows } from '@/types/workflows';
import type { Workspaces } from '@/types/workspaces';

export interface AppState {
    workflow: Workflows,
    workspace: Workspaces
}

export const baseQuery = fetchBaseQuery({
  baseUrl: '/api/app',
//   prepareHeaders: (headers) => {
//     // Example: Add an authorization token to all requests
//     headers.set('Authorization', `Bearer ${localStorage.getItem('token')}`);
//     return headers;
//   },
});

export const appApi = createApi({
  reducerPath: 'appApi',
  baseQuery: fetchBaseQuery({ baseUrl: '/api' }),
  endpoints: (builder) => ({
    loadWorkspace: builder.query<AppState, string>({
      query: (workspace) => `app?workspace=${workspace}`,
    }),
    updateWorkspace: builder.mutation({
      query: (newData) => ({
        url: 'app',
        method: 'POST',
        body: newData,
        // headers: {
        //   // Example: Add custom headers for this request
        //   'Content-Type': 'application/json',
        //   'Another-Custom-Header': 'value',
        // },
      }),
    }),
  }),
});

export const { useLoadWorkspaceQuery, useUpdateWorkspaceMutation } = appApi;

