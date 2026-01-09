const multer = require('multer');
const path = require('path');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../uploads');
if(!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, {recursive: true});
    console.log('upload directory created:', uploadDir);
}
const storage = multer.diskStorage({
    destination: function(req, file, cb){
        cb(null, 'uploads/');
    },
    filename: function(req, file,cb ){
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const fileFilter = (req, file, cb)=>{
    const allowedTypes = ['.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if(allowedTypes.includes(ext)){
        cb(null, true);
    } else {
        cb(new Error('Invalid file type'), false);
    }
};

const upload = multer({
    storage : storage,
    fileFilter : fileFilter,
    limits : {
        fileSize : 10* 1024 * 1024
    }
});

module.exports = upload;