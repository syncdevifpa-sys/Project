function driver(env=process.env) {
    const name=env.DB_CLIENT||'mysql';
    if(!['mysql','postgres'].includes(name))throw new Error('DB_CLIENT deve ser mysql ou postgres.');
    // Esta branch é de preparação: a promoção da produção exige uma revisão própria.
    if(name==='postgres' && (env.VERCEL_ENV==='production'||(!env.VERCEL_ENV&&env.NODE_ENV==='production')) && env.ARCADIA_POSTGRES_PRODUCTION_APPROVED!=='true')
        throw new Error('PostgreSQL em produção exige revisão e autorização explícita.');
    return name;
}
module.exports={driver};
