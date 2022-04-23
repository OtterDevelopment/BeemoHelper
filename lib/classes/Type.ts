// Copyright (c) 2019 dirigeants, MIT License

/**
 * The class for deep checking Types
 */
export default class Type {
    /**
     * The value to generate a deep Type of
     */
    public value: any;

    /**
     * The shallow type of this
     */
    public is: string;

    /**
     * The parent of this type
     */
    private parent?: Type;

    /**
     * The child keys of this Type
     */
    private childKeys: Map<string, Type>;

    /**
     * The child values of this Type
     */
    private childValues: Map<string, Type>;

    /**
     * @param value The value to generate a deep Type of
     * @param [parent=undefined] The parent value used in recursion
     */
    constructor(value: any, parent?: Type) {
        this.value = value;
        this.is = Type.resolve(value);
        this.parent = parent;
        this.childKeys = new Map();
        this.childValues = new Map();
    }

    /**
     * The type string for the children of this Type
     */
    get childTypes() {
        if (!this.childValues.size) return "";
        return `<${
            (this.childKeys.size ? `${Type.list(this.childKeys)}, ` : "") +
            Type.list(this.childValues)
        }>`;
    }

    /**
     * The full type string generated.
     */
    toString(): string {
        this.check();
        return this.is + this.childTypes;
    }

    /**
     * The subtype to create based on this.value's sub value.
     */
    public addValue(value: any) {
        const child = new Type(value, this);
        this.childValues.set(child.is, child);
    }

    /**
     * The subtype to create based on this.value's entries.
     */
    private addEntry([key, value]: [string, any]) {
        const child = new Type(key, this);
        this.childKeys.set(child.is, child);
        this.addValue(value);
    }

    /**
     * Walks the linked list backwards, for checking circulars.
     */
    private *parents() {
        // eslint-disable-next-line consistent-this
        let current: Type | undefined = this;
        // eslint-disable-next-line no-cond-assign
        while ((current = current.parent)) yield current;
    }

    /**
     * Get the deep type name that defines the input.
     */
    check() {
        if (Object.isFrozen(this)) return;
        if (typeof this.value === "object" && this.isCircular())
            this.is = `[Circular:${this.is}]`;
        else if (this.value instanceof Map)
            for (const entry of this.value) this.addEntry(entry);
        else if (Array.isArray(this.value) || this.value instanceof Set)
            for (const value of this.value) this.addValue(value);
        else if (this.is === "Object") this.is = "any";
        Object.freeze(this);
    }

    /**
     * Checks if the value of this Type is a circular reference to any parent.
     */
    isCircular(): boolean {
        for (const parent of this.parents())
            if (parent.value === this.value) return true;
        return false;
    }

    /**
     * Resolves the type name that defines the input.
     */
    static resolve(value: any): string {
        const type = typeof value;
        switch (type) {
            case "object":
                return value === null
                    ? "null"
                    : (value.constructor && value.constructor.name) || "any";
            case "function":
                return `${value.constructor.name}(${value.length}-arity)`;
            case "undefined":
                return "void";
            default:
                return type;
        }
    }

    /**
     * Joins the list of child types.
     */
    static list(values: Map<string, Type>): string {
        return values.has("any")
            ? "any"
            : [...values.values()].sort().join(" | ");
    }
}
