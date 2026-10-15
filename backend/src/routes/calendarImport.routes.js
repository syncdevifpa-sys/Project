const express=require('express'),router=express.Router();
const {authenticateToken}=require('../middlewares/auth.middleware');
const service=require('../services/calendar-import.service');
router.post('/preview',authenticateToken,async(req,res,next)=>{try{await service.actorForImport(req.user.id_usuario);next();}catch(error){res.status(error.status||500).json({error:error.message});}},express.raw({type:'application/pdf',limit:'4mb'}),async(req,res)=>{
    try{res.json(await service.preview(req.body,req.query,req.user.id_usuario));}catch(error){res.status(error.status||500).json({error:error.status?error.message:'Não foi possível preparar a prévia.'});}
});
router.post('/commit',authenticateToken,async(req,res)=>{try{res.json(await service.commit(req.body,req.user.id_usuario));}catch(error){res.status(error.status||500).json({error:error.status?error.message:'Não foi possível importar os eventos.'});}});
router.use((error,req,res,next)=>{if(error.type==='entity.too.large')return res.status(413).json({error:'PDF excede o limite de 4 MB.'});next(error);});
module.exports=router;
