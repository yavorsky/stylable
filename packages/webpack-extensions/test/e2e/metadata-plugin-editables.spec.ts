import { StylableProjectRunner } from '@stylable/e2e-test-kit';
import { expect } from 'chai';
import { join } from 'path';

const project = 'metadata-plugin-editables';

describe(`(${project})`, () => {
    const projectRunner = StylableProjectRunner.mochaSetup(
        {
            projectDir: join(__dirname, 'projects', project),
            puppeteerOptions: {
                // headless: false
            },
        },
        before,
        afterEach,
        after
    );

    const expectMetadataJSON = (content: any) => {
        expect(nullContent(content)).to.eql({
            version: '1.0.0',
            name: 'test',
            fs: {
                '/test/src/index.st.css': {
                    metadata: {
                        namespace: 'o0',
                        depth: 4,
                    },
                    content: null,
                },
                '/test/src/variants/v.st.css': {
                    metadata: {
                        namespace: 'v-o0',
                        variant: true,
                        depth: 4,
                    },
                    content: null,
                },
                '/test/src/variants/v1/v1.st.css': {
                    metadata: {
                        namespace: 'v1_v1-o0',
                        variant: true,
                        depth: 4,
                    },
                    content: null,
                },
                '/test/node_modules/test-components/index.st.css': {
                    metadata: {
                        namespace: 'o1',
                        depth: 3,
                    },
                    content: null,
                },
                '/test/node_modules/test-components/button.st.css': {
                    metadata: {
                        namespace: 'o2',
                        depth: 1,
                    },
                    content: null,
                },
                '/test/node_modules/test-components/gallery.st.css': {
                    metadata: {
                        namespace: 'o3',
                        depth: 2,
                    },
                    content: null,
                },
                '/test/index.st.css': {
                    metadata: {
                        namespace: 'test-index',
                        depth: 4,
                    },
                    content: null,
                },
            },
            components: {
                Index: {
                    id: 'Index',
                    variantsPath: '/test/src/variants',
                    namespace: 'o0',
                    stylesheetPath: '/test/src/index.st.css',
                    snapshots: ['<snapshot>index.js</snapshot>'],
                },
            },
            packages: {
                test: '/test',
                ['test-components']: '/test/node_modules/test-components',
            },
        });
    };

    it('contains metadata', () => {
        const s = projectRunner.getBuildAsset('test.metadata.json');

        expectMetadataJSON(JSON.parse(s));
    });

});

function nullContent(o: any) {
    (Array.isArray(o) ? o : Object.keys(o)).forEach((k) => {
        if (k === 'content') {
            o[k] = null;
        } else if (o[k] && typeof o[k] === 'object') {
            nullContent(o[k]);
        }
    });
    return o;
}
