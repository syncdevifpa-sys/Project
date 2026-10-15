// Consulta somente leitura. Não imprime host, usuário, senha ou nome do banco.
const fs=require('node:fs'),path=require('node:path'),mysql=require('mysql2/promise'),dotenv=require('dotenv');
async function main(){
    const envFile=path.resolve(__dirname,'../backend/.env');
    const saved=fs.existsSync(envFile)?dotenv.parse(fs.readFileSync(envFile)):{};
    const env={...saved,...process.env},host=env.DB_HOST;
    if(!host){console.log(JSON.stringify({scope:'não configurado',connected:false}));return;}
    const scope=/(^|\.)aivencloud\.com$/i.test(host)?'Aiven':/^(localhost|127\.0\.0\.1|::1)$/i.test(host)?'local (não comprova registros da Aiven)':'remoto (provedor não confirmado)';
    let connection;
    try{
        connection=await mysql.createConnection({host,user:env.DB_USER,password:env.DB_PASSWORD,database:env.DB_NAME,port:Number(env.DB_PORT||3306),connectTimeout:5000,...(env.DB_SSL==='true'?{ssl:{rejectUnauthorized:true,...(env.DB_SSL_CA?{ca:env.DB_SSL_CA}:{})}}:{})});
        const [courses]=await connection.execute('SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY nome');
        console.log(JSON.stringify({scope,connected:true,total:courses.length,active:courses.filter(c=>c.ativo===1||c.ativo===true).length,courses}));
    }catch(error){console.log(JSON.stringify({scope,connected:false,errorCode:error.code||'CONNECTION_FAILED'}));process.exitCode=1;}
    finally{if(connection)await connection.end();}
}
main();
