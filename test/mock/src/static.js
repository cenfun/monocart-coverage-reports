class ClassWithStaticInitializationBlock {
    static staticProperty1 = 'Property 1';
    static staticProperty2;
    static {
        const funInStatic = (v) => {
            if (v) {
                return v;
            }
            return 'function in static';
        };
        if (this.staticProperty2) {
            this.staticProperty2 = 'Property 2';
        } else {
            this.staticProperty2 = 'Property 1';
            funInStatic(this.staticProperty1);
        }
    }

    static staticProperty3;

    constructor() {
        this.prop = 1;
    }

    myMethod() {
        this.prop = 2;
    }
}

module.exports = {
    ClassWithStaticInitializationBlock
};
