const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require ('multer');
const GridfsStorage = require ('multer-gridfs-storage');
const Grid = require ('gridfs-stream');
const methodeOverride = require ('method-override');

const app = express();

//MIDDLE WARE FUNCTIONS
app.use(bodyParser.json());     //https://stackoverflow.com/questions/38306569/what-does-body-parser-do-with-express
app.use(methodeOverride('_method'));    //https://stackoverflow.com/questions/23643694/whats-the-role-of-the-method-override-middleware-in-express-4
app.set('view engine','ejs');

//MONGODB Uniform Resource Identifier
const mongoURI = "mongodb://localhost:27017/folder";

//Creating Mongo Connection
const conn = mongoose.createConnection(mongoURI);

// declaring gfs globally
let gfs;
//Using gridfs along with mongo
conn.once('open', () => { 
    // init stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
  })


// Create storage engine
const storage = new GridfsStorage({
  url: 'mongodb://localhost:27017/folder',
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {  // check module_used.js for details
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'//name of bucket list and collection must be same
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });
  
// GET / ---> LOAD FORM TO DISPLAY ALL THE FILES PRESENT

app.get('/',(req,res)=>{
    gfs.files.find().toArray((err,files)=>{
        if(!files || files.length==0){
            res.render('index',{files:false});
        }
        else{
            files.map(file=>{  //map is a strong function mainly to desmostrate for image objects to other files
                if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' )  
                    {
                        file.isImage = true;
                    }
                else
                   {
                        file.isImage = false;
                   } 
                
            });
            res.render('index',{files:files});
        }
        
    });
});


// route GET / i.e. loads form
app.get('/',(req,res)=>{
    var retVal = prompt("FILE UPLOADED!!");
    res.render('index');
});

// route POST/upload  i.e. Uploads file to db 
app.post('/upload', upload.single('file'), (req,res)=>{ // upload is middle ware used along with single as we are uploading only one file at a time and also in the bracket we have written the name of the file name of the command used in index.ejs page line no.17
    //res.json({file:req.file}); --> this wsa to to just check the uploaded file's json text
    res.redirect('/'); // redirects immediately to the home page after the upload is over

});

// GET/files --> DISPLAY ALL THE FILES PRESENT IN THE JSON
app.get('/files',(req,res)=>{
    gfs.files.find().toArray((err,files) =>{
            // Check if files exists
            if(!files || files.length===0){
                return res.status(404).json({
                    err: 'No files Found'
                });
            }
            //File Exists
            return res.json(files);
    });
});

//GET/files/:filename --->SingleFile --> Display a single file in the JSon format
app.get('/files/:filename',(req,res)=>{
    gfs.files.findOne({ filename: req.params.filename},(err,file) =>{
            // Check if files exists
            if(!file || file.length===0){
                return res.status(404).json({
                    err: 'No files Found'
                });
            }
            //File Exists
            return res.json(file);
    });
});
//GET/image/:filename --->SingleFile --> Display a IMAGE AFTER CHECKING FORMAT
app.get('/image/:filename',(req,res)=>{
    gfs.files.findOne({ filename: req.params.filename},(err,file) =>{
            // Check if files exists
            if(!file || file.length===0){
                return res.status(404).json({
                    err: 'No files Found'
                });
            }
            //File Exists
               // CHECK IF ITS AN IMAGE
               if(file.contentType === 'image/jpeg' || file.contentType === 'image/png' ){
                   // READ o/p to browser
                   const readstream = gfs.createReadStream(file);
                   readstream.pipe(res);
               }
               else{
                   res.status(404).json({
                       err : 'NOT AN IMAGE'
                   });
               }
    });
});



const PORT = process.env.PORT || 5000;

app.listen(PORT, ()=>console.log(`SERVER RUNNING AT PORT ${PORT}`));
