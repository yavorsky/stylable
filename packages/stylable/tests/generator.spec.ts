import { Generator, Mode } from '../src/generator';
import { SelectorAstNode } from '../src/parser';
import { Stylesheet } from '../src/stylesheet';
import { expect } from "chai";


describe('Generator', function () {

    describe('generator.addEntry', function () {

        let generator: Generator;

        beforeEach(() => {
            generator = new Generator({});
        });

        it('generate empty', function () {
            const stylesheet = new Stylesheet({});
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([]);
        });

        it('generate with single rule', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black" }
            });
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([".container {\n    color: black\n}"]);
        });

        it('generate with multiple rules', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black", background: "white" }
            });
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([".container {\n    color: black;\n    background: white\n}"]);
        });

        it('generate with multiple selectors', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black" },
                ".wrapper": { background: "white" }
            });
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([
                ".container {\n    color: black\n}",
                ".wrapper {\n    background: white\n}"
            ]);
        });


        it('generate dose not add the same sheet twice', function () {
            const stylesheet = new Stylesheet({
                ".container": { color: "black" },
                ".wrapper": { background: "white" }
            });
            generator.addEntry(stylesheet);
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([
                ".container {\n    color: black\n}",
                ".wrapper {\n    background: white\n}"
            ]);
        });

    });

    describe('generator with namespace', function () {
        let generator: Generator;

        beforeEach(() => {
            generator = new Generator({ namespaceDivider: "__THE_GREAT_DIVIDER__" });
        });


        it('generate scoped selector', function () {

            const stylesheet = new Stylesheet({
                ".container": {}
            }, 'TheNameSpace');

            generator.addEntry(stylesheet);

            expect(generator.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container {}');

        });

        it('generate scoped selector with multiple classes', function () {


            const stylesheet = new Stylesheet({
                ".container .img": {}
            }, 'TheNameSpace');

            generator.addEntry(stylesheet);

            expect(generator.buffer[0]).to.eql('.TheNameSpace__THE_GREAT_DIVIDER__container .TheNameSpace__THE_GREAT_DIVIDER__img {}');

        });

    });

    describe('Generator.handlePseudoElement', function () {

        it('keep unknown pseudo-element', function () {
            const generator = new Generator({});
            const stylesheet = new Stylesheet({}, 'NS');
            const node: SelectorAstNode = {
                name: 'myelement',
                type: 'pseudo-element',
                nodes: []
            };
            const resolved = generator.handlePseudoElement(stylesheet, node, 'myelement');
            expect(node).to.contain({ name: 'myelement', type: 'pseudo-element' });
            expect(node.name).to.equal('myelement');
            expect(resolved).to.equal(stylesheet);
        });


        it('replace known pseudo-elements', function () {
            const generator = new Generator({});
            
            const stylesheet = new Stylesheet({
                "myelement": {}
            }, 'NS');

            const node: SelectorAstNode = {
                name: 'myelement',
                type: 'pseudo-element',
                nodes: []
            };
            const resolved = generator.handlePseudoElement(stylesheet, node, 'myelement');
            expect(node).to.contain({ name: 'myelement', type: 'pseudo-element' });
            expect(node.name).to.equal('myelement');
            expect(resolved).to.equal(stylesheet);
        });

    });

    describe('remove empty selectors on production mode', function () {
        it('generate empty', function () {
            const generator = new Generator({ mode: Mode.PROD });
            const stylesheet = new Stylesheet({
                ".container": {}
            });
            generator.addEntry(stylesheet);
            expect(generator.buffer).to.eql([]);
        });
    });

});


