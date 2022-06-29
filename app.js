require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require("passport");
const session = require("express-session");
const passportlocalmongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const nodemailer = require('nodemailer');
const findOrCreate = require("mongoose-findorcreate");
const mailer = require("./utils/mailer");
const $ = require('mongo-dot-notation')
// const updatectg = require("./utils/upctg");
const crypto = require("crypto");
const path = require("path")
const bcrypt = require("bcrypt");
const { getUnpackedSettings } = require('http2');
const CircularJSON = require('circular-json')
// const Router = require("router")
// var MongoClient = require('mongodb').MongoClient;


const app = express();
app.use(express.static(__dirname + '/public'));
// app.use(express.static("public"));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));

const saltRounds = 10;

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false,
}))

app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());

mongoose.connect("mongodb://localhost:27017/userDB1", { useUnifiedTopology: true, useNewUrlParser: true });
mongoose.set('useCreateIndex', true);

var userSchema = new mongoose.Schema({
    username: String,
    email: String,
    password: String,
    phone: String,
    active: {
        type: Boolean,
        default: false
    },
    activeToken: String,
    activeExpires: Date,
    forgotToken: String,
    forgotExpires: Date,
    googleId: String,
    profileURL: String,
    purchaseList: Array
});

var foodSchema = new mongoose.Schema({
    hotelId: String,
    imgurl: String,
    name: String,
    price: Number,
    profileURL: String,
    tag: Array,
    Type: String,
    availability: Boolean,
    Total_orders: Number
});

var hotelSchema = new mongoose.Schema({
    name: String,
    ownername: String,
    description: String,
    phone: String,
    profileURL: String,
    menuURL: String,
    timing: String,
    status: String,
    menu: Array,
    Type: String,
    Tags: Array,
    category: {
        bestseller: { type: Array },
        snacks: { type: Array },
        starters: { type: Array },
        roti: { type: Array },
        dessert: { type: Array },
        soup: { type: Array },
        rice: { type: Array },
        shakes: { type: Array },
    },
    Total_orders: Number
});

var orderSchema = new mongoose.Schema({
    hotelId: String,
    items: Array,
    quantity: [Number],
    // orderItems: [{itemid: String, quantity: String}],
    // orderItems: {String: String},
    billAmount: Number,
    status: String,
    Date: String,
    customerId: String,
    paid: Boolean,
    request: String
});

var ownerSchema = new mongoose.Schema({
    ownername: String,
    phone: String,
    altphone: String,
    address: String,
    createdAt: String,
    hotelId: String
    // sellList: Array
});


userSchema.plugin(passportlocalmongoose, { usernameField: "email" });
userSchema.plugin(findOrCreate);

ownerSchema.plugin(passportlocalmongoose);
ownerSchema.plugin(findOrCreate);


const Hotel = new mongoose.model("Hotel", hotelSchema);
const FoodItem = new mongoose.model("FoodItem", foodSchema);
const Order = new mongoose.model("Order", orderSchema);
const User = new mongoose.model("User", userSchema);
const Owner = new mongoose.model("Owner", ownerSchema);


// const newhotel1 = new Hotel({
//     name: "The Kamals",
//     description: "My .hotel is one of the best hotel.Have a look on menu to know more",
//     phone: "2344344",
//     profileURL: "kamal.jpg",
//     timing: "9 AM to 12 PM",
//     menuCardPhoto: "kamalmenu.jpg",
//     status: "open",
//     menu: [],
//     ownerId: "5f268cdd69353644b88a77b4",
//     Tags: ["indian", "chinese"],
//     Type: "veg",
//     Total_orders: 0
// });
// newhotel1.save();

// const newhotel2 = new Hotel({
//     name: "The Sharmas",
//     description: "My hotel si one of the old hotel standing since the establishment of the BITS",
//     phone: "2344344",
//     profileURL: "sharma.jpg",
//     timing: "9 AM to 12 PM",
//     menuCardPhoto: "sharmamenu.jpg",
//     status: "open",
//     menu: [],
//     ownerId: "5f268cdd69353644b88a77b5",
//     Tags: ["indian", "italian"],
//     Type: "non-veg",
//     Total_orders: 0
// });
// newhotel2.save();

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/food",
},
    function (accessToken, refreshToken, profile, cb) {
        User.findOrCreate({ googleId: profile.id, email: profile.emails[0].value, mobileg: false }, function (err, user) {
            return cb(err, user);
        });
    }
));


app.get('/auth/google',
    passport.authenticate('google', {
        scope: ['https://www.googleapis.com/auth/userinfo.profile',
            'https://www.googleapis.com/auth/userinfo.email']
    })
);

app.get('/auth/google/food',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        res.redirect('/index');
    });


app.get("/", (req, res) => {
    res.render("welcome");
})

app.get("/register", (req, res) => {
    res.render("register");
})

app.get("/login", (req, res) => {
    res.render("login");
})

app.get("/index", (req, res) => {
    if (req.isAuthenticated()) {
        // Hotel.find({}, function (err, users) {
        //     return res.end(JSON.stringify(users));
        // })
        res.render("index");
    } else {
        res.render("login");
    }
})

app.get("/forgot", (req, res) => {
    res.render("forgot");
})

app.get("/menu", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("menu")
    } else {
        res.render("login");
    }
})

app.get("/menuform", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("menuform")
    } else {
        res.render("login");
    }
})

app.get("/cart", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("cart")
    } else {
        res.render("login");
    }
})

app.get("/ownerapp", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("ownerapp")
    } else {
        res.render("login");
    }
})

app.get("/owner", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("owner")
    } else {
        res.render("login");
    }
})

app.get("/ownerRegister", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("ownerRegister")
    } else {
        res.render("login");
    }
})

app.get("/ownerlogin", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("ownerlogin")
    } else {
        res.render("login");
    }
})

app.get("/hotelstatus", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("hotelstatus")
    } else {
        res.render("login");
    }
})

app.get("/hoteledit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("hoteledit")
    } else {
        res.render("login");
    }
})

app.get("/hoteldetail", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("hoteldetail")
    } else {
        res.render("login");
    }
})

app.get("/mobile", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("mobile")
    } else {
        res.render("login");
    }
})

app.get("/availability", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("availability")
    } else {
        res.render("login");
    }
})

app.get("/itemedit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("itemedit")
    } else {
        res.render("login");
    }
})

app.get("/complete", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("complete")
    } else {
        res.render("login");
    }
})

app.get("/request", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("request")
    } else {
        res.render("login");
    }
})

app.get("/restaurantlist", (req, res) => {
    if (req.isAuthenticated()) {
        Hotel.find({}, function (err, users) {
            return res.end(JSON.stringify(users));
        })
    } else {
        res.render("login");
    }
})
//restaurant/hotel_id
app.get("/restaurant/:hotel_id", (req, res) => {
    if (req.isAuthenticated()) {
        FoodItem.find({ hotelId: req.params.hotel_id }, function (err, users) {
            return res.end(JSON.stringify(users));
        })
    } else {
        res.render("login");
    }
})

app.get("/logout", (req, res) => {
    req.logOut();
    res.redirect("/");
})


app.get('/account/active/:activeToken', function (req, res, next) {

    User.findOne({
        activeToken: req.params.activeToken,
        // check if the expire time > the current time       
        activeExpires: { $gt: Date.now() }
    }, function (err, user) {
        if (err) return next(err);

        // invalid activation code
        if (!user) {
            return res.render('register');
            //<--------- add flash message - expiry of token. sign up again --------->
        }

        // activate and save
        user.active = true;
        user.save(function (err, user) {
            if (err) return next(err);

            // activation success
            res.render('index')
            //<--------- add flash - successfully logged in ------->
        });
    });

});


app.post("/register", (req, res) => {

    Users = new User({
        email: req.body.email,
        username: req.body.username,
        // phone: req.body.phone,
    });

    //<------add flash message - required email, username, password, mobile------>

    User.register(Users, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/login");
        } else {
            passport.authenticate("local")(req, res, () => {
                // res.redirect("/success1");
                if (req.isAuthenticated()) {

                    // Generate 20 bit activation code, ‘crypto’ is nodejs built in package.
                    crypto.randomBytes(20, function (err, buf) {

                        // Ensure the activation code is unique.
                        user.activeToken = user._id.toString('hex');

                        // Set expiration time is 24 hours.
                        user.activeExpires = Date.now() + 2 * 60 * 1000;
                        var link = 'http://localhost:3000/account/active/'
                            + user.activeToken;

                        // Sending activation email
                        mailer.send({
                            to: req.body.email,
                            subject: 'Welcome',
                            html: 'Please click <a href="' + link + '"> here </a> to activate your account.'
                        });

                        // save user object
                        user.save(function (err, user) {
                            if (err) return next(err);
                            res.render("register");
                            //<------add flash message - check your email to activate account------>

                            // res.send('The activation email has been sent to' + user.email + ', please click the activation link within 2 minutes.');

                        });
                    });

                } else {
                    res.render("/login");
                    // <-------flash message - user with this email id already exist---->
                }
            })
        }
    });

});


app.post("/login", (req, res) => {
    const user = new User({
        email: req.body.email,
        password: req.body.password,
    })

    User.findOne({ email: req.body.email, active: true }, function (error, founduser) {
        if (error) return next(error);
        if (!founduser) res.render("register");//<------flash message - either email is not registered or email has not been activated ------->
        req.login(user, function (err) {
            if (err) {
                console.log(err);
                res.redirect("/login");
                //<--------flash message-  email id and password not match--------->
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/index");
                })
            }
        })
    });
})


app.post("/forgot", (req, res) => {

    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return next(err);

        // not registered
        if (!user) {
            return res.render('register');//<--------flash message - user with this mail id does not exist please register--------->
        } else if (!user.active) {
            //<------- flash message -  "Account not active. please activate your account first" ------->
            res.render("welcome")
        }
        else {
            // Generate 20 bit reset token, ‘crypto’ is nodejs built in package.
            crypto.randomBytes(20, function (err, buf) {

                // Ensure the activation code is unique.
                user.forgotToken = user._id.toString('hex');

                // Set expiration time is 10 minutes.
                user.forgotExpires = Date.now() + 10 * 60 * 1000;
                var link = 'http://localhost:3000/account/forgotpsw/' + user.forgotToken;

                // Sending activation email
                mailer.send({
                    to: req.body.email,
                    subject: 'Reset Password Link',
                    html: 'Please click <a href="' + link + '"> here </a> to reset account password.'
                });

                // save user object
                user.save(function (err, user) {
                    if (err) return next(err);
                    res.render("welcome");//<-------flash - check your email to set new password---->

                    // res.send('email has been sent to ' + user.email + ', please click the reset link to reset account password');
                });
            });

        }
    })

})


app.get('/account/forgotpsw/:resetToken', function (req, res, next) {

    User.findOne({ forgotToken: req.params.resetToken, forgotExpires: { $gt: Date.now() } }, function (err, user) {
        if (err) return next(err);

        // invalid forgotToken
        if (!user) {
            return res.render('reset');
            //<------ flash - invalid token ------>
        }
        res.render('reset');
    });

});


app.post("/reset", (req, res) => {

    if (req.body.password === req.body.repassword) {
        User.findOne({ email: req.body.email }, function (err, foundUser) {
            if (err) {
                console.log(err);
            }
            console.log(foundUser);
            if (foundUser) {
                foundUser.setPassword(req.body.password, function () {
                    foundUser.forgotToken = "";
                    foundUser.forgotExpires = "";
                    foundUser.save();
                    res.render("login");
                });
            } else {
                res.render("register");
                //<------flash - user with this email does not exist ------>
            }
        });
    }

})


app.post("/ownerapp", (req, res) => {

    const fooditem = new FoodItem({
        hotelId: req.body.resid,
        profileURL: req.body.profileURL,
        name: req.body.name,
        price: req.body.price,
        tag: [req.body.ingred1, req.body.ingred2],
        Type: req.body.type,
        availability: true,
        Total_orders: 0,
    })

    FoodItem.findOne({ name: req.body.name, hotelId: req.body.resid }, (err, user) => {
        if (err) return next(err);

        if (user) {
            res.render("ownerapp")
        } // item already exist for that hotel
        else {
            FoodItem.insertMany(fooditem).then(function () {
                console.log("Data inserted")  // Success 
            }).catch(function (error) {
                console.log(error)      // Failure 
            });

            Hotel.updateOne({ _id: req.body.resid }, { $push: { menu: fooditem._id } }, function (err, res) {
                // of docs that MongoDB updated
            });
            Hotel.findOne({ _id: req.body.resid }, async function (err, res) {
                // of docs that MongoDB updated
                // console.log(user._id)
                const cat = res.category[req.body.category];
                cat.push(fooditem._id);
                await res.save();
            });
            res.render("ownerapp");
        }
    })
})


app.post("/viewcart", async (req, res) => {
    var itemsarr = [];
    var quantityarr = [];
    itemsarr.push(req.body.item1_id);
    itemsarr.push(req.body.item2_id);
    itemsarr.push(req.body.item3_id);
    quantityarr.push(req.body.item1_quantity);
    quantityarr.push(req.body.item2_quantity);
    quantityarr.push(req.body.item3_quantity);

    console.log(itemsarr);
    console.log(quantityarr);

    Order.findOne({ customerId: req.body.user_id, paid: false }, async (err, user) => {
        if (err) return next(err);

        if (!user) { // user has not added anything to cart // or he has order and paid // (to add new document in order collection)
            const order = new Order({
                hotelId: req.body.hotel_id,
                items: itemsarr,
                quantity: quantityarr,
                status: "pending",
                request: "not requested",
                Date: new Date().toLocaleDateString(),
                customerId: req.body.user_id,
                paid: false,
                billAmount: 0
            })

            await Order.insertMany(order).then(function () {
                console.log("order inserted")  // Success 
            }).catch(function (error) {
                console.log(error)      // Failure 
            });

            var amount = 0;
            for (let i = 0; i < quantityarr.length; i++) {
                await FoodItem.findOne({ _id: order.items[i] }, async (err, foodDoc) => {
                    if (err) return next(err);

                    if (!foodDoc) {
                        res.render("menuform")
                    } else {
                        amount += (order.quantity[i]) * (foodDoc.price);  // update total amount to be paid
                        console.log(amount);
                        await Order.updateOne({ _id: order._id }, { billAmount: amount }, function (err, res) {
                            //     // of docs that MongoDB updated
                        });
                    }
                })
            }
            res.render("menuform")
        }
        else {
            user.items = itemsarr;
            user.quantity = quantityarr;
            user.Date = new Date().toLocaleDateString()
            user.hotelId = req.body.hotel_id
            await user.save();
            var amount = 0;
            for (let i = 0; i < quantityarr.length; i++) {
                await FoodItem.findOne({ _id: itemsarr[i] }, async (err, foodDoc) => {
                    if (err) return next(err);

                    if (!foodDoc) {
                        res.render("menuform")
                    } else {
                        amount += (Number(quantityarr[i])) * (foodDoc.price);  // update total amount to be paid
                        console.log(amount);
                        await Order.updateOne({ _id: user._id }, { billAmount: amount }, function (err, res) {
                            //     // of docs that MongoDB updated
                        });
                    }
                })
            }
            res.render("menuform")
        }
    })

})

app.post("/hotelregister", async (req, res) => {
    var tagarr = [];
    tagarr.push(req.body.tag1)
    tagarr.push(req.body.tag2)
    const hotel = new Hotel({
        name: req.body.name,
        ownername: req.body.ownername,
        description: req.body.description,
        phone: req.body.phone,
        profileURL: req.body.profileURL,
        menuURL: req.body.menuURL,
        timing: req.body.timing,
        Tags: tagarr,
        Type: req.body.type,
        status: "close",
        menu: [],
        Total_orders: 0,
    })

    await Hotel.findOne({ name: req.body.name }, async (err, user) => {
        if (err) return next(err);

        if (user) {
            res.render("hoteldetail")
        } // item already exist for that hotel
        else {
            await Hotel.insertMany(hotel).then(function () {
                console.log("Hotel Data inserted")  // Success 
                Owner.updateOne({ ownername: req.body.ownername }, { hotelId: hotel._id }, (err, res) => {
                    console.log("hotelid updated in owner collection");
                })
            }).catch(function (error) {
                console.log(error)      // Failure 
            });

            res.render("owner");
        }
    })
})


app.post("/hoteledit", async (req, res) => {
    var tagarr = [];
    tagarr.push(req.body.tag1)
    tagarr.push(req.body.tag2)

    Hotel.findOne({ _id: req.body.hotelid }, async (err, hoteldoc) => {
        if (err) return next(err);

        if (!hoteldoc) { // user has not added anything to cart // or he has order and paid // (to add new document in order collection)
            res.render("owner")
        }
        else {
            hoteldoc.name = req.body.name,
                hoteldoc.description = req.body.description,
                hoteldoc.phone = req.body.phone,
                hoteldoc.profileURL = req.body.profileURL,
                hoteldoc.menuURL = req.body.menuURL,
                hoteldoc.timing = req.body.timing,
                hoteldoc.Tags = tagarr,
                hoteldoc.Type = req.body.type,
                await hoteldoc.save();
            res.render("owner");
        }
    })

})

app.post("/itemedit", async (req, res) => {

    FoodItem.findOne({ _id: req.body.itemid }, async (err, itemdoc) => {
        if (err) return next(err);

        if (!itemdoc) { // user has not added anything to cart // or he has order and paid // (to add new document in order collection)
            res.render("owner")
        }
        else {
                itemdoc.name = req.body.name,
                itemdoc.price = req.body.price,
                itemdoc.tag = [req.body.ingred1, req.body.ingred2],
                itemdoc.profileURL = req.body.profileURL,
                itemdoc.Type = req.body.type,
                await itemdoc.save();
            res.render("owner");
        }
    })

})


// app.post("/ownerRegister", (req, res) => {

//     owners = new Owner({
//         ownername: req.body.ownername,
//         phone: req.body.phone,
//         altphone: req.body.altphone,
//         address: req.body.address,
//         createdAt: new Date().toLocaleDateString()
//     });

//     Owner.register(owners, req.body.password, function (err, user) {
//         if (err) {
//             console.log(err);
//             res.redirect("/ownerlogin");
//         } else {
//             passport.authenticate("local")(req, res, ()=> {
//                 res.render("/owner");
//             })
//         }
//     });

// })

// app.post("/ownerlogin", (req, res) => {
//     const owners = new Owner({
//         ownername: req.body.name,
//         password: req.body.password,
//     })
//     req.login(owners, function (err) {
//         if (err) {
//             console.log(err);
//             res.redirect("/ownerlogin");
//         } else {
//             console.log("running");
//             passport.authenticate("local")(req, res, ()=> {
//                 console.log("running inside")
//                 res.render("/owner");
//             })
//         }
//     })
// })


app.post("/open", async (req, res) => {
    await Hotel.updateOne({ _id: req.body.hotel_id }, { status: "open" }, (err, hoteldoc) => {
        console.log("hotel is open now")
    });
    res.render("owner")
})

app.post("/close", async (req, res) => {
    await Hotel.updateOne({ _id: req.body.hotel_id }, { status: "close" }, (err, hoteldoc) => {
        console.log("hotel is closed now")
    });
    res.render("owner")
})

app.post("/mobile", async (req, res) => {
    await User.updateOne({ email: req.body.email }, { phone: req.body.phone }, (err, userdoc) => {
        console.log("mobile number added to db")
    });
    await Order.updateOne({ _id: req.body.order_id }, { request: "requested" }, (err, userdoc) => {
        console.log("request sent to vendor")
    });

    res.render("owner")
})

app.post("/accept", async (req, res) => {
    await Order.updateOne({ _id: req.body.order_id }, { request: "accepted" }, (err, userdoc) => {
        console.log("order accepted")
    });
    res.render("owner")
})

app.post("/reject", async (req, res) => {
    await Order.deleteOne({ _id: req.body.order_id }, function (err) {
        console.log("order rejected by vendor, order deleted")
    });
    res.render("owner")
})

app.post("/available", async (req, res) => {
    await FoodItem.updateOne({ _id: req.body.item_id }, { availability: true }, (err, itemdoc) => {
        console.log("item is now available")
    });
    res.render("owner")
})

app.post("/notavailable", async (req, res) => {
    await FoodItem.updateOne({ _id: req.body.item_id }, { availability: false }, (err, itemdoc) => {
        console.log("item is now not available")
    });
    res.render("owner")
})

app.post("/complete", async (req, res) => {
      
    Order.findOne({ _id: req.body.order_id }, async (err, orderdoc) => {
        if (err) return next(err);

        if (!orderdoc) { // user has not added anything to cart // or he has order and paid // (to add new document in order collection)
            res.render("cart");
        }

        if (orderdoc) {// user have previuosly added something in cart (to update already existing collection)

            for (let i = 0; i < orderdoc.quantity.length; i++) {
                FoodItem.findOne({ _id: orderdoc.items[i] }, async (err, foodDoc) => {
                    if (err) return next(err);

                    if (!foodDoc) {
                        res.render("menuform")
                    } else {
                        foodDoc.Total_orders += orderdoc.quantity[i]; // update no of times particular item is ordered
                        await foodDoc.save();
                    }
                })
            }

            orderdoc.Date = new Date().toLocaleDateString()
            orderdoc.status = "completed";
            orderdoc.paid = true;
            await orderdoc.save();
            await Hotel.updateOne({ _id: req.body.hotel_id }, { $inc: { Total_orders: 1 } }, function (err, res) {
                //     // of docs that MongoDB updated
            });
            await User.updateOne({ _id: req.body.user_id }, { $push: { purchaseList: orderdoc._id } }, function (err, res) {
                // of docs that MongoDB updated
            });
            await Owner.updateOne({ _id: req.body.owner_id }, { $push: { sellList: orderdoc._id } }, function (err, res) {
                // of docs that MongoDB updated
            });
        }
        res.render("owner")
    })

})


app.listen(3000, function () {
    console.log("server started at port 3000");
})





// app.post("/checkout", (req, res) => {
//     var itemsarr = [];
//     var quantityarr = [];
//     itemsarr.push(req.body.item1_id);
//     itemsarr.push(req.body.item2_id);
//     itemsarr.push(req.body.item3_id);
//     quantityarr.push(req.body.item1_quantity);
//     quantityarr.push(req.body.item2_quantity);
//     quantityarr.push(req.body.item3_quantity);

//     console.log(itemsarr);
//     console.log(quantityarr);

//     Order.findOne({ customerId: req.body.user_id, checkout: false }, async (err, orderno) => {
//         if (err) return next(err);

//         if (!orderno) { // user has not added anything to cart // or he has order and paid // (to add new document in order collection)
//             res.render("cart");
//             console.log("!order me update");
//         }

//         if (orderno) {// user have previuosly added something in cart (to update already existing collection)
//             orderno.quantity = [];
//             orderno.items = [];

//             var amount = 0;

//             for (let i = 0; i < quantityarr.length; i++) {
//                 var a = orderno.items.indexOf(itemsarr[i]);
//                 console.log(a);
//                 if (a >= 0) {
//                     orderno.quantity[a] += Number(quantityarr[i]);
//                     Order.updateOne({ _id: orderno._id }, { quantity: orderno.quantity }, (err, user) => {

//                     })
//                 } else {
//                     orderno.quantity.push(quantityarr[i]);
//                     orderno.items.push(itemsarr[i]);
//                 }
//                 FoodItem.findOne({ _id: orderno.items[i] }, async (err, foodDoc) => {
//                     if (err) return next(err);

//                     if (!foodDoc) {
//                         res.render("menuform")
//                     } else {
//                         amount += (orderno.quantity[i]) * (foodDoc.price);  // update total amount to be paid
//                         console.log(amount);
//                         Order.updateOne({ _id: orderno._id }, { billAmount: amount }, function (err, res) {
//                             //     // of docs that MongoDB updated
//                         });
//                         foodDoc.Total_orders += orderno.quantity[i]; // update no of times particular item is ordered
//                         await foodDoc.save();
//                     }
//                 })
//             }

//             orderno.Date = new Date().toLocaleDateString()
//             orderno.checkout = true;
//             await orderno.save();
//             Hotel.updateOne({ _id: req.body.hotel_id }, { $inc: { Total_orders: 1 } }, function (err, res) {
//                 //     // of docs that MongoDB updated
//             });
//             User.updateOne({ _id: req.body.user_id }, { $push: { purchaseList: orderno._id } }, function (err, res) {
//                 // of docs that MongoDB updated
//             });
//             res.render("cart");
//             console.log("succesfully updated");
//         }
//     })

// })






// } else if (user.hotelId != req.body.hotel_id) {   //need to delete already saved document if user switches to order from new hotel but he has added items from another hotel previously

//     await Order.deleteOne({ customerId: req.body.user_id, checkout: false }, function (err, result) {
//         if (err) console.log(err)
//         else console.log(result)
//     })
//     const order = new Order({
//         hotelId: req.body.hotel_id,
//         items: itemsarr,
//         quantity: quantityarr,
//         status: "pending",
//         Date: new Date().toLocaleDateString(),
//         customerId: req.body.user_id,
//         checkout: false,
//         billAmount: 0
//     })

//     await Order.insertMany(order).then(function () {
//         console.log("order inserted")  // Success 
//     }).catch(function (error) {
//         console.log(error)      // Failure 
//     });

//     var amount = 0;
//     for (let i = 0; i < quantityarr.length; i++) {
//         await FoodItem.findOne({ _id: order.items[i] }, async (err, foodDoc) => {
//             if (err) return next(err);

//             if (!foodDoc) {
//                 res.render("menuform")
//             } else {
//                 amount += (order.quantity[i]) * (foodDoc.price);  // update total amount to be paid
//                 console.log(amount);
//                 await Order.updateOne({ _id: order._id }, { billAmount: amount }, function (err, res) {
//                     //     // of docs that MongoDB updated
//                 });
//             }
//         })
//     }
//     res.render("menuform")

// } else {


//----------------------------------------


// if (user) {// user have previuosly added something in cart (to update already existing collection)
//     for (let i = 0; i < itemsarr.length; i++) {
//         // console.log(a);
//         if (user.items.includes(itemsarr[i])) {
//             var a = user.items.indexOf(itemsarr[i]);
//             console.log(a)
//             user.quantity[a] += Number(quantityarr[i]);
//             await user.markModified('quantity');

//             var amount = user.billAmount;
//             await FoodItem.findOne({ _id: itemsarr[i] }, async (err, foodDoc) => {
//                 amount += (Number(quantityarr[i])) * (foodDoc.price);  // update total amount to be paid
//                 // await user.save();
//                 // console.log(amount);
//                 await Order.updateOne({ _id: user._id }, { billAmount: amount }, function (err, res) {
//                     //     // of docs that MongoDB updated
//                 });
//             })

//             await user.save();
//             console.log(user.quantity)
//         } else {
//             user.items.push(itemsarr[i]);
//             user.quantity.push(Number(quantityarr[i]));

//             var amount = user.billAmount;
//             await FoodItem.findOne({ _id: itemsarr[i] }, async (err, foodDoc) => {
//                 amount += (Number(quantityarr[i])) * (foodDoc.price);  // update total amount to be paid
//                 // await user.save();
//                 // console.log(amount);
//                 await Order.updateOne({ _id: user._id }, { billAmount: amount }, function (err, res) {
//                     //     // of docs that MongoDB updated
//                 });
//             })

//             await user.save();
//         }
//         // var amount = user.billAmount;
//         // console.log(amount);
//         // await FoodItem.findOne({ _id: itemsarr[i] }, async (err, foodDoc) => {
//         //     if (err) return next(err);

//         //     if (!foodDoc) {
//         //         res.render("menuform")
//         //     } else {
//         //         amount += (Number(quantityarr[i])) * (foodDoc.price);  // update total amount to be paid
//         //         // await user.save();
//         //         // console.log(amount);
//         //         await Order.updateOne({ _id: user._id }, { billAmount: amount }, function (err, res) {
//         //             //     // of docs that MongoDB updated
//         //         });
//         //     }
//         // })
//     }

//     user.Date = new Date().toLocaleDateString()
//     user.save()
//     res.render("menuform")
// }



//----------------------------------------------



// for (let i = 0; i < itemsarr.length; i++) {
//     var a = user.items.indexOf(itemsarr[i]);
//     if(a>=0){
//         user.quantity[a] += Number(quantityarr[i]);
//         Order.updateOne({_id: user._id}, {quantity: user.quantity}, (err, user)=>{
//             //doc updated
//         })
//         console.log(user.quantity)
//     } else{
//         await user.items.push(itemsarr[i]);
//         await user.quantity.push(Number(quantityarr[i]));
//     }
// var amount = user.billAmount;
// await FoodItem.findOne({ _id: itemsarr[i] }, async (err, foodDoc) => {
//     if (err) return next(err);

//     if (!foodDoc) {
//         res.render("menuform")
//     } else {
//         amount += (Number(quantityarr[i])) * (foodDoc.price);  // update total amount to be paid
//         console.log(amount);
//         await Order.updateOne({ _id: user._id }, { billAmount: amount }, function (err, res) {
//             //     // of docs that MongoDB updated
//         });
//     }
// })
// }



// app.post("/add", (req, res) => {
//     Order.findOne({ customerId: req.body.user_id, checkout: false }, (err, orderdoc) => {
//         if (err) return next(err);

//         FoodItem.findOne({ _id: req.body.item_id }, (err1, foodDoc) => {
//             if (err1) return next(err1);

//             if (!foodDoc) {
//                 res.render("cart")
//             } else {
//                 for (let i = 0; i < orderdoc.quantity.length; i++) {
//                     if (orderdoc.items[i] == foodDoc._id) {
//                         Order.updateOne({ _id: orderdoc._id }, { $inc: { billAmount: foodDoc.price } }, function (err, res) {
//                             //     // of docs that MongoDB updated
//                         });
//                         orderdoc.quantity[i] += 1;
//                         Order.updateOne({ _id: orderdoc._id }, { quantity: orderdoc.quantity }, function (err, res) {
//                             //     // of docs that MongoDB updated
//                         });
//                         orderdoc.Date = new Date().toLocaleDateString();
//                         orderdoc.save();
//                         break;
//                     }
//                 }
//                 // orderdoc.save()
//             }
//         })

//     })
// })


// app.post("/subtract", (req, res) => {
//     Order.findOne({ customerId: req.body.user_id, checkout: false }, (err, orderdoc) => {
//         if (err) return next(err);

//         FoodItem.findOne({ _id: req.body.item_id }, (err1, foodDoc) => {
//             if (err1) return next(err1);

//             if (!foodDoc) {
//                 res.render("cart")
//             } else {
//                 for (let i = 0; i < orderdoc.quantity.length; i++) {
//                     if (orderdoc.items[i] == foodDoc._id) {
//                         Order.updateOne({ _id: orderdoc._id }, { $inc: { billAmount: -foodDoc.price } }, function (err, res) {
//                             //     // of docs that MongoDB updated
//                         });
//                         orderdoc.quantity[i] -= 1;
//                         Order.updateOne({ _id: orderdoc._id }, { quantity: orderdoc.quantity }, function (err, res) {
//                             //     // of docs that MongoDB updated
//                         });
//                         orderdoc.Date = new Date().toLocaleDateString();
//                         orderdoc.save();
//                         break;
//                     }
//                 }
//                 // orderdoc.save()
//             }
//         })

//     })
// })

