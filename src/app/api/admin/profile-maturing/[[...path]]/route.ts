import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { list, detail, control, workbook, start, desktop } from '@/lib/maturing/service.mjs';
export const dynamic='force-dynamic';
export const maxDuration=180;
type Context={params:Promise<{path?:string[]}>};
async function handle(req:NextRequest,ctx:Context){
  try{
    const user=await requireAdmin();
    if(req.method==='POST' && req.headers.get('origin')!==req.nextUrl.origin) return NextResponse.json({error:'Invalid request origin'},{status:403});
    const {path=[]}=await ctx.params;
    let data;
    if(req.method==='GET' && path[0]==='desktop')data=await desktop(path.slice(1).join('/'),req.nextUrl.searchParams);
    else if(req.method==='GET' && !path.length)data=await list();
    else if(req.method==='GET' && path.length===1)data=await detail(path[0]);
    else if(req.method==='GET' && path.length===2 && path[1]==='results')data=await workbook(path[0],req.nextUrl.searchParams);
    else if(req.method==='POST' && path.length===1 && path[0]==='start')data=await start(await req.json(),user.email);
    else if(req.method==='POST' && path.length===2)data=await control(path[0],path[1]);
    else return NextResponse.json({error:'Not found'},{status:404});
    return NextResponse.json(data,{headers:{'Cache-Control':'private, no-store'}});
  }catch(error){
    const message=error instanceof Error?error.message:'Unable to load profile maturing.';
    const status=message==='Unauthorized'?401:message==='Forbidden'?403:typeof error==='object'&&error&&'status' in error?Number(error.status):502;
    return NextResponse.json({error:message},{status,headers:{'Cache-Control':'private, no-store'}});
  }
}
export const GET=handle;
export const POST=handle;
