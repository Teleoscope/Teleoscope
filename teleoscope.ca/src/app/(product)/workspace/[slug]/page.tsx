"use client";;
import { loadAppData } from '@/actions/appState';
import Workspace from '@/components/Workspace';
import { useLoadWorkspaceQuery } from '@/services/app';
import { useEffect } from 'react';
import { useDispatch } from 'react-redux';

export default function WorkspacePage({
    params
}: {
    params: { slug: string };
}) {

    const { data: app, error, isLoading  } = useLoadWorkspaceQuery(params.slug)
    const dispatch = useDispatch();

    useEffect(() => {
        if (app) {
          console.log("app", app)

          dispatch(loadAppData(app));
        }
      }, [app, dispatch]);
    

    
    return <Workspace workspace={params.slug} />
    
}
