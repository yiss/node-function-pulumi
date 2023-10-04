import * as aws from '@pulumi/aws';
import * as pulumi from '@pulumi/pulumi';
import * as esbuild from 'esbuild';
import * as fflate from 'fflate';
import * as fs from 'fs';
import * as path from 'path';
import * as rimraf from 'rimraf';


const esbuildDefaultOpts: esbuild.BuildOptions = {
    bundle: true,
    minify: true,
    sourcemap: false,
    platform: 'node',
    target: 'node18',
    outdir: 'build',
  };

interface NodeFunctionArgs extends aws.lambda.FunctionArgs {
  /**
   * The file path for the lambda
   */
  entry: string;
  /**
   * A custom esbuild configuration
   * @default :
   * {  
   *    bundle: true,
        minify: true,
        sourcemap: false,
        platform: "node",
        target: "node18",
        outdir: "build",
   * }
   */
  esbuild?: esbuild.BuildOptions;
  /**
   * Zip the bundled function into a zip archive called lambda.zip
   * @default true
   */
  zip?: boolean;
}

/**
 * Creates a custom NodeJs function that extends the basic aws.lambda.Function
 * It cleans the build folder, bundles the code with the dependencies and creates a zip file that will be used as code for the lambda function
 * Example :
 * 
 * ```
    const function = new NodeFunction(
    "my-function",
        {
            handler: "index.handler",
            role: role.arn,
            runtime: aws.lambda.Runtime.NodeJS18dX,
            entry: 'src/lambda.ts',
            environment: {
                variables: {
                    
                },
            },
            esbuild: {

            }
        }
    );
 * ```
 */
export class NodeFunction extends aws.lambda.Function {
  constructor(name: string, args: NodeFunctionArgs) {
    const { bundle, minify, sourcemap, platform, target, outdir } =
      args.esbuild ?? esbuildDefaultOpts;

    if (!outdir)
      throw new Error(
        'You must specify an outdir in esbuild options default to : build',
      );

    // clean the outdir before running another build
    rimraf.rimrafSync(outdir);
    // delete the old zip file if exist
    rimraf.rimrafSync('lambda.zip');

    esbuild.buildSync({
      entryPoints: [args.entry],
      bundle,
      minify,
      sourcemap,
      platform,
      target,
      outdir,
    });

    // by default we only have one file containing the bundled javascript code for our lambda
    const [outputFile] = fs.readdirSync(outdir);

    // we zip the code in write the lambda.zip file
    const zipContent = fflate.zipSync({
      'index.js': fs.readFileSync(
        path.resolve(process.cwd(), outdir, outputFile),
      ),
    });

    fs.writeFileSync('lambda.zip', zipContent);

    const code = new pulumi.asset.FileArchive('lambda.zip');

    super(name, {
      ...args,
      code: code,
      packageType: 'Zip',
      runtime: aws.lambda.Runtime.NodeJS18dX
    });
  }
}
