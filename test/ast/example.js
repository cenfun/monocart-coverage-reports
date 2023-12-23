const rootFunction = (tf1, tf2) => {

    if (tf1) {
        console.log('if1');
    }


    const subFunction = () => {

        if (tf2) {

            if (tf1) {
                console.log(tf1);
            }

        }

    };

    if (subFunction()) {

        if (tf2) {
            console.log(tf2);
        }

    }

};

module.exports = rootFunction;
