var http = require('http'),
    express = require('express'),
    app = express(),
    sqlite3 = require('sqlite3').verbose(),
    bodyParser = require('body-parser'),
    db = new sqlite3.Database('cozy');

// app config
(function() {
   /* We add configure directive to tell express to use Jade to
      render templates */
   app.set('views', __dirname + '/public');
   app.set('view engine', 'pug');

   // Allows express to get data from POST requests
   app.use(bodyParser.urlencoded({
       extended: true
   }));
   app.use(bodyParser.json());
})();


// set up async sqlite
(function() {
   const operations = ['all', 'get', 'run'];
   operations.forEach(op => {
      db[op + 'Async'] = function (sql) {
         return new Promise((resolve, reject) => {
            this[op](sql, function (err, row) {
               if (err) reject(err);
               else resolve(row);
            });
         });
      }
   });
})();


// Database initialization
(async function() {
   try {
      const row = await db.getAsync("SELECT name FROM sqlite_master WHERE type='table' AND name='bookmarks'");
   
      if(row == null) {
         await db.runAsync('CREATE TABLE "bookmarks" ("id" INTEGER PRIMARY KEY AUTOINCREMENT, "title" VARCHAR(255), url VARCHAR(255))');
         console.log("SQL Table 'bookmarks' initialized.");
      } else {
         console.log("SQL Table 'bookmarks' already initialized.");
      }
   } catch (err) {
      console.log(err);
   }
})();

// We render the templates with the data
app.get('/', async function(req, res) {
   try {
      const row = await db.allAsync('SELECT * FROM bookmarks ORDER BY title');
      res.render('index.pug', { bookmarks: row }, function(err, html) {
         if (err) throw err;
         res.status(200).send(html);
      });
   } catch (err) {
      res.status(500).send("An error has occurred -- " + err);
   }
});

// We define a new route that will handle bookmark creation
app.post('/add', async function({ body: { title, url } }, res) {
   const sqlRequest = "INSERT INTO 'bookmarks' (title, url) VALUES('" + title + "', '" + url + "')"
   try {
      await db.runAsync(sqlRequest);
      res.redirect('back');
   } catch (err) {
      res.status(500).send("An error has occurred -- " + err);
   }
});

// We define another route that will handle bookmark deletion
app.get('/delete/:id', async function({ params: { id } }, res) {
   try {
      await db.runAsync("DELETE FROM bookmarks WHERE id='" + id + "'");
      res.redirect('back');
   } catch (err) {
      res.status(500).send("An error has occurred -- " + err);
   }
});

/* This will allow Cozy to run your app smoothly but
 it won't break other execution environment */
var port = process.env.PORT || 9250;
var host = process.env.HOST || "127.0.0.1";

// Starts the server itself
var server = http.createServer(app).listen(port, host, function() {
    console.log("Server listening to %s:%d within %s environment",
                host, port, app.get('env'));
});