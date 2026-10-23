const express=require('express');
const { authenticateToken }=require('../middlewares/auth.middleware');
const { authenticateExternal }=require('../middlewares/externalAuth.middleware');
const { createReminders }=require('../services/task-reminders.service');
function createRouter(auth,ownerOf,service=createReminders()) {
    const router=express.Router();
    router.use(auth);
    router.use((_q,s,next)=>{s.set('Cache-Control','no-store');next();});
    const action=(fn)=>async(q,s)=>{
        try { await fn(q,s,ownerOf(q)); }
        catch(e) {
            const migration=['ER_NO_SUCH_TABLE','ER_BAD_FIELD_ERROR'].includes(e.code);
            if(!e.status && !migration) console.error('[reminders] Falha de operação.',e.code||e.name);
            s.status(e.status||(migration?503:500)).json({error:e.status?e.message:migration?'Lembretes precisam da atualização do banco pela equipe.':'Não foi possível concluir a operação de lembretes.'});
        }
    };
    router.get('/preferences',action(async(q,s,owner)=>s.json(await service.settings(owner))));
    router.put('/preferences',action(async(q,s,owner)=>s.json(await service.consent(owner,q.body||{}))));
    router.get('/event/:source/:id',action(async(q,s,owner)=>s.json(await service.event(owner,q.params.source,q.params.id))));
    router.get('/',action(async(q,s,owner)=>s.json(await service.listReminders(owner))));
    router.get('/:id',action(async(q,s,owner)=>{
        const row=await service.findReminderById(q.params.id,owner);
        s.status(row?200:404).json(row||{error:'Lembrete não encontrado.'});
    }));
    router.post('/',action(async(q,s,owner)=>{
        const result=await service.createReminder(owner,q.body||{});
        s.status(201).json({message:'Lembrete salvo.',reminderId:result.insertId});
    }));
    router.put('/:id',action(async(q,s,owner)=>{
        await service.updateReminder(q.params.id,owner,q.body||{});
        s.json({message:'Lembrete atualizado.'});
    }));
    router.delete('/:id',action(async(q,s,owner)=>{
        const result=await service.deleteReminder(q.params.id,owner);
        s.status(result.affectedRows?200:404).json({message:result.affectedRows?'Lembrete excluído.':'Lembrete não encontrado.'});
    }));
    return router;
}
const router=createRouter(authenticateToken,(q)=>q.user.id_usuario);
router.externalRouter=createRouter(authenticateExternal,(q)=>({external:q.externalUser.id_externo}));
router.createRouter=createRouter;
module.exports=router;
