const router=require('express').Router();
const {authenticateToken}=require('../middlewares/auth.middleware');
const {editContent}=require('../services/content-edit.service');
router.patch('/:kind/:id',authenticateToken,async(req,res)=>{
    try{await editContent(req.params.kind,req.params.id,req.body,req.user.id_usuario);res.json({message:'Conteúdo atualizado.'});}
    catch(error){res.status(error.status||500).json({error:error.status?error.message:'Não foi possível salvar o conteúdo.'});}
});
module.exports=router;
