import "dotenv/config";


const config = {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 3000,
  jwt : {
    secret: process.env.JWT_SECRET,
    expireIn: process.env.JWT_EXPIRATION
  },
  db:{
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.NODE_ENV === "development"? process.env.DB_NAME : process.env.DB_NAME_TEST,
  
  },
  cors:{
    origins: process.env.CORS_ORIGIN || "*"
  }
};

if(!config.db.host || !config.db.port || !config.db.user || !config.db.password || !config.db.database){
  throw new Error('Fatal Error: Missing database configuration');
}
if(!config.jwt.secret || !config.jwt.expireIn){
  throw new Error('Fatal Error: Missing JWT configuration');
} 
// ghbv
export default config;