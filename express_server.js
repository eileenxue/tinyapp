const express = require("express");
const app = express();
const PORT = 8080; // default port 8080

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended: true}));

const cookieParser = require("cookie-parser");
app.use(cookieParser());

app.set("view engine", "ejs");

// Simulate unique shortURL by returning a string of 6 random alphanumeric characters
function generateRandomString() {
  let string = Math.random().toString(36).substring(2, 8);
  return string;
}

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

const users = { 
  "userRandomID": {
    id: "userRandomID", 
    email: "user@example.com", 
    password: "purple-monkey-dinosaur"
  },
 "user2RandomID": {
    id: "user2RandomID", 
    email: "user2@example.com", 
    password: "dishwasher-funk"
  }
}

// Create user logic function
const findUsersByEmail = function (email, users) {
  for (let userId in users) {
    const user = users[userId];
    if (email === user.email) {
      return user;
    }
  }
  return false;
}

// New helper function?
// const createUser = function (email, password, users) {
//   const userId = generateRandomString();

//   // add to user database
//   users[userId] = {
//     id: userId,
//     email: email, 
//     password: password
//   };

//   return userId;
// }

const authenticateUser = function (email, password, users) {
  const userFound = findUsersByEmail(email, users);

  if (userFound && userFound.password === password) {
    return userFound;
  }
  return false;
};

app.get("/", (req, res) => {
  res.send("Hello!");
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

// change from url to urls
app.get('/urls', (req, res) => {
  const userId = req.cookies['user_id'];
  // console.log({userId});
  const loggedInUser = users[userId];
  const templateVars = { urls: urlDatabase, user: loggedInUser };
  res.render("urls_index", templateVars)
})
 
app.get("/urls/new", (req, res) => {
  const userId = req.cookies['user_id'];
  const loggedInUser = users[userId];
  const templateVars = { user: loggedInUser };
  if (loggedInUser) {
    res.render("urls_new", templateVars);
  } else {
    res.redirect('/login');
  }
});

app.get("/urls/:shortURL", (req, res) => {
  const userId = req.cookies['user_id'];
  const loggedInUser = users[userId];
  const templateVars = { shortURL: req.params.shortURL, longURL: urlDatabase[req.params.shortURL], user: loggedInUser };
  res.render("urls_show", templateVars);
});

// Redirect the shortened URL to original longURL
app.get("/u/:shortURL", (req, res) => {
  const shortURL = req.params.shortURL;
  const longURL = urlDatabase[shortURL];
  res.redirect(longURL);
});

// Registration Page
app.get("/register", (req, res) => {
  const templateVars = { user: null };
  const userId = req.cookies['user_id'];
  const loggedInUser = users[userId];
  // Show the right pages when user is logged in and logged out
  if (!loggedInUser) {
    res.render("urls_register", templateVars);
  } else {
    res.redirect('/urls');
  }
})

// Login Page
app.get("/login", (req, res) => {
  const templateVars = { user: null };
  const userId = req.cookies['user_id'];
  const loggedInUser = users[userId];
  // Show the right pages when user is logged in and logged out
  if (!loggedInUser) {
    res.render("urls_login", templateVars);
  } else {
    res.redirect('/urls');
  }
})

app.post("/urls", (req, res) => {
  // console.log(req.body);  // Log the POST request body to the console
  // res.send("Ok");  // Respond with 'Ok' (we will replace this)
  // res.status = 200;

  // Generate shortURL and then log that and longURL to urlDatabase
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;

  // Redirect page to shortURL
  res.redirect(`/urls/${shortURL}`);
});

// Delete the shortURL entry
app.post("/urls/:shortURL/delete", (req, res) => {
  const deleteURL = req.params.shortURL;
  delete urlDatabase[deleteURL];

  // Redirect back to index page
  res.redirect(`/urls`);
})

// Update/Edit URL
app.post("/urls/:shortURL", (req, res) => {
  // extract the shortURL 
  const shortURL = req.params.shortURL;

  // extract new URL content from the form's input's name => req.body
  const longURL = req.body.longURL;

  // update the longURL content in the db associated with that shortURL
  urlDatabase[shortURL] = longURL;

  res.redirect(`/urls`);
})

// Login Functionality
app.post("/login", (req, res) => {
  // Get user info from form
  const email = req.body.email;
  const password = req.body.password;
  const userFound = findUsersByEmail(email, users);
  
  const user = authenticateUser(email, password, users);

  // compare password with the email
  if (user) {
    // if valid, assign the user_id cookie to match user's ID
    res.cookie('user_id', userFound.id);

    // Redirect back to urls
    res.redirect(`/urls`);
    return;
  } 
    
  res.status(403).send("Wrong credentials");
  
})

// Logout Functionality
app.post("/logout", (req, res) => {
  // clears the user_id cookie
  res.clearCookie('user_id');
  // Redirect back to urls
  res.redirect(`/urls`); 
})

// Register Functionality
app.post("/register", (req, res) => {
  // get user info such as email, password and randomly generated userID
  const email = req.body.email;
  const password = req.body.password;
  const userId = generateRandomString();
  
  // check if user exist already, if yes send an error, else proceed
  const userFound = findUsersByEmail(email, users);

  if(userFound) {
    res.status(400).send("Sorry, that user already exists!");
    return;
  }
  
  // Registration Form Error Handling
  if(email.length === 0 && password.length === 0) {
    res.status(400).send("Please enter your email and password");
    return;
  } else if (email.length === 0) {
    res.status(400).send("Please enter your email");
    return;
  } else if (password.length === 0) {
    res.status(400).send("Please enter your password");
    return;
  }

  console.log(userFound);

  // const userId = createUser(email, password, users);
  
  // add to user database
  users[userId] = {
    id: userId,
    email: email, 
    password: password
  };

  // set user_id cookie to be newly generated ID
  res.cookie('user_id', userId);
  // redirect to /urls
  res.redirect('/urls');
})


app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});