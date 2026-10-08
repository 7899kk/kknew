export function parseOAuthCallback(url:string):{code:string;flowId?:string} {
  const parsed=new URL(url);
  const fragment=new URLSearchParams(parsed.hash.slice(1));
  const get=(key:string)=>parsed.searchParams.get(key)||fragment.get(key);
  const error=get('error_description')||get('error');
  if(error)throw new Error(error);
  const code=get('code');
  if(!code)throw new Error('Google sign-in did not return a login code. Please try again.');
  return {code,flowId:get('sb_flow_id')||undefined};
}
