// StAuth10065: I Raj Patel, 000744572 certify that this material is my original work. No other person's work has been used without due acknowledgement. I have not made my work available to anyone else.
// Payment Reference: https://github.com/code-nebula/stripe-recurring-subscriptions

const express = require('express');
const session = require('express-session')
const mustacheExpress = require('mustache-express');
const sqlite3 = require('sqlite3').verbose();

const app = express();

const account = 'AC80ac235bcd4ab6b46ac33a2caca7c906'; // Your account
const authToken = 'AC80ac235bcd4ab6b46ac33a2caca7c906'; // Your auth-token
const client = require('twilio')(account, authToken); 

// replace your stripe key 
const stripe_key = 'sk_test_AC80ac235bcd4ab6b46ac33a2caca7c906';


// Server Side -- Stripe API 
require('dotenv').config();
const stripe = require('stripe')(stripe_key);

var stripe_data = {}

let db = new sqlite3.Database('api.db', (err) => {
    // db.run('DROP TABLE IF EXISTS users')
    if (err) {
        console.log(err.message);
    } else {
        db.run('CREATE TABLE IF NOT EXISTS users (name TEXT, password TEXT, email TEXT, birth_date TEXT, phone TEXT, plan_name TEXT, monthly_amount TEXT, plan_id TEXT, customer_id_stripe TEXT)');
    }
});

// Getting product stripe plans
stripe.plans.list(
    { limit: 3 },
    function (err, plans) {

        stripe_data.plan_1 = {}
        stripe_data.plan_2 = {}
        stripe_data.plan_3 = {}
        stripe_data.plan_1.name = plans.data[0].nickname
        stripe_data.plan_2.name = plans.data[1].nickname
        stripe_data.plan_3.name = plans.data[2].nickname

        var am1 = plans.data[0].amount_decimal
        stripe_data.plan_1.amount = (am1 / 100).toFixed(2)
        var am2 = plans.data[1].amount_decimal
        stripe_data.plan_2.amount = (am2 / 100).toFixed(2)

        var am3 = plans.data[2].amount_decimal
        stripe_data.plan_3.amount = (am3 / 100).toFixed(2)

        stripe_data.plan_1.interval = plans.data[0].interval
        stripe_data.plan_2.interval = plans.data[1].interval
        stripe_data.plan_3.interval = plans.data[2].interval

        stripe_data.plan_1.id = plans.data[0].id
        stripe_data.plan_2.id = plans.data[1].id
        stripe_data.plan_3.id = plans.data[2].id

        stripe_data.plan_1.interval_count = plans.data[0].interval_count
        stripe_data.plan_2.interval_count = plans.data[1].interval_count
        stripe_data.plan_3.interval_count = plans.data[2].interval_count

        stripe_data.plan_1.product = plans.data[0].product
        stripe_data.plan_2.product = plans.data[1].product
        stripe_data.plan_3.product = plans.data[2].product
    }
);

app.engine("mustache", mustacheExpress());
app.set('view engine', 'mustache');
app.set('views', __dirname + '/views');

app.use(express.urlencoded({ extended: false }));

// Use the session middleware
app.use(session({ secret: 'keyboard cat', resave: false, saveUninitialized: false }));

// Rendering index web page
app.get('/app', function (req, res) {
    res.render("index")
});

app.get('/login', function (req, res) {
    loginerror = req.session.login_error;
    req.session.login_error = "";

    if (!req.session.user) {
        res.render("loginPage", { errormsg: loginerror });
    }
    else {
        res.redirect("/customer");
    }
});

app.get('/register', function (req, res) {
    res.render("registerPage")
});

// Login page
app.post('/login', function (req, res) {
    loginerror = req.session.login_error;
    req.session.login_error = "";

    if (!req.session.user) {
        res.render("loginPage", { errormsg: loginerror });
    }
    else {
        res.redirect("/customer");
    }

});

// Register page
app.post('/register', function (req, res) {

    loginerror = req.session.login_error;
    req.session.login_error = "";
    res.render("registerPage");
});

app.get('/admin', function (req, res) {
    // if no user is not logged-in, re-direct them to the login page
    if (!req.session.user) {
        res.redirect("/login");
    }
    else {
        getCustomers()
        req.session.listOfCustomers = list
        res.render("admin", { listOfCustomers: req.session.listOfCustomers });
    }
});

// Attempts to log the user in
app.post('/attemptLogin', function (req, res) {

    if (req.body.email == "admin@app.com" &&
        req.body.pwd == "admin") {
        req.session.user = req.body.email;

        res.redirect("/admin");
        return;
    }

    login_email = req.body.email;
    login_pwd = req.body.pwd;
    var flag = true;
    for (i in list) {
        if (list[i].email === login_email && list[i].password === login_pwd) {
            req.session.customerInfo = list[i];
            var personalInfo = {
                name: list[i].name,
                email: list[i].email,
                password: list[i].password,
                birth_date: list[i].birth_date,
                phone: list[i].phone
            }
            req.session.personalInfo = personalInfo;
            req.session.user = login_email;
            // console.log(req.session.customerInfo);
            req.session.login_error = "";
            flag = false;
            res.redirect("/customer");
        }
    }
    if (flag) {
        req.session.login_error = "Username and Password not found!";
        res.redirect("/login");
    }
});

// Get all customers from database and store it in a global list variable
var list;
var stm = 'SELECT * FROM users';
var params = [];
getCustomers();
function getCustomers() {
    db.all(stm, params, async function (err, result) {
        if (err) {
            return;
        }
        list = result
    });
}

// Attempts to log the user in
app.post('/sendCode', function (req, res) {

    console.log(req.body);
    var randomNumber = Math.floor(100000 + Math.random() * 900000);
    var phone = '+1' + req.body.phone;
    client.messages
        .create({ body: 'Your code: ' + randomNumber, from: '+12028664431', to: phone })
        .then(message => console.log(message.body));

    req.session.NewUserName = req.body.name
    req.session.NewEmail = req.body.email
    req.session.NewPwd = req.body.pwd
    req.session.NewBtd = req.body.btd
    req.session.NewPhone = req.body.phone
    req.session.randomCode = randomNumber

    req.session.user = req.body.email
    res.render("verification", { phoneNumber: req.session.NewPhone, randomCode: req.session.randomCode, codeError: "" });
});

app.get('/verify', function (req, res) {
    if (!req.session.randomCode) {
        res.redirect("/register");
    } else {
        req.session.code_error = "Entered code did not match!";
        res.render("verification", { phoneNumber: req.session.NewPhone, randomCode: req.session.randomCode, codeError: req.session.code_error })
    }
});

app.post('/verify', function (req, res) {
    if (req.session.randomCode == req.body.code) {
        console.log("User Verified");
        req.session.user = req.session.NewEmail
        delete (req.session.randomCode);
        res.redirect("/subscriptionPage");

    } else {
        req.session.code_error = "Entered code did not match!";
        res.redirect("/verify");
    }

});


app.get('/customer', function (req, res) {
    // if no user is not logged-in, re-direct them to the login page
    if (!req.session.user) {
        res.redirect("/login");
    }
    else {
        getCustomers()
        delete (req.session.customerInfo)
        delete (req.session.customerInfo)
        for (i in list) {
            if (list[i].email === req.session.user) {
                req.session.customerInfo = list[i];
                req.session.stripeID = list[i].customer_id_stripe;
                var personalInfo = {
                    name: list[i].name,
                    email: list[i].email,
                    password: list[i].password,
                    birth_date: list[i].birth_date,
                    phone: list[i].phone
                }
                console.log("in loop");
                console.log(list[i]);
                req.session.personalInfo = personalInfo;
                // req.session.user = login_email;
                req.session.login_error = "";

            }
        }
        res.render("customer",
            { email: req.session.user, customerInfo: req.session.customerInfo, personalInfo: req.session.personalInfo });
        //res.redirect(req.originalUrl)
    }
});

// Subscription Page
app.get('/subscriptionPage', function (req, res) {
    if (!req.session.user) {
        res.redirect('/register');
    } else {
        res.render('subscriptionPage', { plans: stripe_data });
    }
});

// Payment Page
app.post('/subscribe', function (req, res) {
    if (!req.session.user) {
        res.redirect('/register');
    } else {
        console.log(req.body);
        var product = {
            name: req.body.productName
        };

        var plan = {
            id: req.body.planId,
            name: req.body.planName,
            amount: req.body.planAmount,
            interval: req.body.planInterval,
            interval_count: req.body.planIntervalCount
        };

        res.render('signUp', { product: product, plan: plan, email: req.session.user });
    }
});

// Logout action
app.get('/logout', function (req, res) {

    delete (req.session.user);

    // redirect the user to the login page
    res.redirect("/login");
});

var stripe_cus_id = ""
function createCustomerAndSubscription(req) {
    return stripe.customers.create({
        source: req.body.stripeToken,
        email: req.body.customerEmail,
        name: req.body.fullName
    }).then(customer => {
        stripe_cus_id = customer.id;
        stripe.subscriptions.create({
            customer: customer.id,
            items: [
                {
                    plan: req.body.planId
                }
            ]
        });
        req.session.customer_id_stripe = stripe_cus_id;
    });
};

app.post('/charge', (req, res) => {
    if (req.session.NewEmail) {
        var customerInfo = {
            name: req.session.NewUserName,
            email: req.session.NewEmail,
            birth_date: req.session.NewBtd,
            phone: req.session.NewPhone,
            password: req.session.NewPwd,
            plan_id: req.body.planId,
            plan_name: req.body.planName,
            monthly_amount: req.body.planAmount,
            customer_id_stripe: req.session.customer_id_stripe
        }

        var personalInfo = {
            name: req.session.NewUserName,
            email: req.session.NewEmail,
            birth_date: req.session.NewBtd,
            phone: req.session.NewPhone,
            password: req.session.NewPwd
        }
        req.session.customerInfo = customerInfo;
        req.session.personalInfo = personalInfo;
        delete (req.session.NewEmail);
        createCustomerAndSubscription(req).then(() => {
            createNewUser(req.session.personalInfo, req.session.customerInfo, res);
            getCustomers();
        }).catch(err => {
            res.render('registerPage', { error: true });
        });

    } else {
        console.log("DEBUG");
        console.log(req.session.customerInfo)
        console.log(req.session.stripeID);
        console.log(req.body.planId);
        (async () => {
            await stripe.customers.retrieve(
                req.session.stripeID,
                function (err, customer) {
                    req.session.subID = customer.subscriptions.data[0].id;
                    console.log(req.session.subID);
                    (async () => {
                        const subscription = await stripe.subscriptions.retrieve(req.session.subID);

                        stripe.subscriptions.update(req.session.subID, {
                            cancel_at_period_end: false,
                            items: [{
                                id: subscription.items.data[0].id,
                                plan: req.body.planId,
                            }]
                        }, function (err, success) {
                            if (err) {
                                console.log(err);
                            } else {
                                db.serialize(() => {
                                    let stm = 'UPDATE users SET plan_name = ?, monthly_amount = ?, plan_id = ? WHERE email = ?'
                                    let params = [req.body.planName, req.body.planAmount, req.body.planId, req.session.user]
                                    db.all(stm, params, (err, row) => {
                                        if (err) {
                                            console.log(err);
                                            return;
                                        }
                                        getCustomers();
                                        res.redirect("/customer");
                                    });
                                });
                            }
                        });
                    })();
                }
            );
        })();
    }

});

// Create new user for the application and store it into sqlite database
function createNewUser(personalInfo, customerInfo, res) {
    var stm = 'INSERT INTO users (name, password, email, birth_date, phone, plan_name, monthly_amount, plan_id, customer_id_stripe) VALUES (?,?,?,?,?,?,?,?,?)'
    var params = [personalInfo.name,
    personalInfo.password,
    personalInfo.email,
    personalInfo.birth_date,
    personalInfo.phone,
    customerInfo.plan_name,
    customerInfo.monthly_amount,
    customerInfo.plan_id,
        stripe_cus_id]
    db.run(stm, params, function (err, result) {
        if (err) {
            console.log(err);
            console.log("cannot store customer")
            return;
        }
        res.redirect("/customer");
    });
}

// Change plan CUSTOMER
app.post('/changePlan', (req, res) => {
    console.log("Redirecting to Subscription Page");
    getCustomers()
    for (i in list) {
        if (list[i].email === req.session.user) {
            req.session.stipe_id = list[i].customer_id_stripe;
        }
    }
    console.log("1 - " + req.session.stipe_id);
    res.redirect("/subscriptionPage")
});

app.post('/editUserInformation', (req, res) => {
    if (!req.session.user) {
        res.redirect("/login");
    } else {
        res.render("editUserInformation", { personalInfo: req.session.personalInfo });
    }
});

// Update personal information CUSTOMER
app.post("/update", (req, res) => {
    db.serialize(() => {
        let stm = 'UPDATE users SET birth_date = ?, phone = ?, password = ? WHERE email = ?'
        console.log(req.body.pwd);
        let params = [req.body.btd, req.body.phone, req.body.pwd, req.session.user]
        db.all(stm, params, (err, row) => {
            if (err) {
                console.log(err);
                return;
            }

            tempPersonalInfo = req.session.personalInfo;
            delete (req.session.personalInfo);

            var personalInfo = {
                name: tempPersonalInfo.name,
                email: req.session.user,
                password: req.body.pwd,
                birth_date: req.body.btd,
                phone: req.body.phone
            }
            console.log(personalInfo);


            req.session.personalInfo = personalInfo
            console.log(row);
            res.redirect("/customer")
        });
        getCustomers();
    });
});

// Delete subscription CUSTOMER
app.post("/deleteSubscription", (req, res) => {
    stripe.customers.del(
        stripe_cus_id,
        function (err, confirmation) {
            // asynchronously called
            console.log(err);
        }
    );
    let sqlStm = "DELETE FROM users WHERE customer_id_stripe = ?"
    let params = req.body.customerPlanID;
    db.run(sqlStm, params, (error, row) => {
        if (error) {
            response.status(400).json({ "error": error.message });
            return;
        }
    });
    getCustomers();
    res.redirect("/logout");
});

// Delete customer from the application ADMIN
app.post("/removeCustomer", (req, res) => {
    stripe.customers.del(
        req.body.customerID,
        function (err, confirmation) {
            if (err) {
                console.log(err);
            }
            console.log("Deleted Stripe_ID: " + req.body.customerID)
        }
    );

    let sqlStm = "DELETE FROM users WHERE customer_id_stripe = ?"
    let params = req.body.customerID;

    function query(sql, args) {
        return new Promise((resolve, reject) => {
            db.run(sql, args, (err, rows) => {
                if (err)
                    return reject(err);
                resolve(rows);
                getCustomers();
                req.session.listOfCustomers = list
                res.redirect("/admin");
            });
        });
    }

    query(sqlStm, params).then(rows => {
        // do something with the result
        console.log("User Deleted Sqlite3");
    });

});

app.post("/switch", (req, res) => {
    getCustomers();
    for (i in list) {
        if (list[i].customer_id_stripe === req.body.customerID) {
            req.session.stipe_id = list[i].customer_id_stripe;
            console.log(req.session.stipe_id);
        }
    }
    (async () => {
        await stripe.customers.retrieve(
            req.session.stipe_id,
            function (err, customer) {
                // console.log(customer);
                req.session.subID = customer.subscriptions.data[0].id;
                req.session.adminUser_Email = req.body.email;
                console.log(req.session.subID);
                console.log(req.session.adminUser_Email);
                res.redirect("/adminSwitchUser");
            }
        );
    })();
});

app.get("/adminSwitchUser", (req, res) => {
    if (req.session.user === "admin@app.com")
        res.render("adminSwitchPlan", { plans: stripe_data })
    else
        res.redirect("/logout");
});

// Admin change user plan
app.post("/switchUser", (req, res) => {
    console.log(req.body.planId);
    console.log(req.session.subID);
    (async () => {
        const subscription = await stripe.subscriptions.retrieve(req.session.subID);

        stripe.subscriptions.update(req.session.subID, {
            cancel_at_period_end: false,
            items: [{
                id: subscription.items.data[0].id,
                plan: req.body.planId,
            }]
        }, function (err, success) {
            if (err) {
                console.log(err);
            } else {
                console.log(success);
                console.log(req.session.adminUser_Email);
                console.log(req.session.subID);
                db.serialize(() => {
                    let stm = 'UPDATE users SET plan_name = ?, monthly_amount = ?, plan_id = ? WHERE email = ?'
                    let params = [req.body.planName, req.body.planAmount, req.body.planId, req.session.adminUser_Email]
                    db.all(stm, params, (err, row) => {
                        if (err) {
                            console.log(err);
                            return;
                        }
                        getCustomers();
                        res.redirect("/admin");
                    });
                });
            }
        });
    })();


});
var server = app.listen(3000, function () { console.log("Server listening..."); })
