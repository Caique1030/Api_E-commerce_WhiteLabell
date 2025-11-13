import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runScript(scriptName: string, description: string) {
  console.log(`🔄 ${description}...`);
  try {
    const { stdout, stderr } = await execAsync(
      `npm run ts-node src/scripts/${scriptName}.ts`,
    );
    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);
    console.log(`✅ ${description} concluído!\n`);
  } catch (error) {
    console.error(
      `❌ Erro em ${description}:`,
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function bootstrap() {
  console.log('🚀 Iniciando população do banco de dados...\n');

  await runScript('init-clients', 'Criação de clientes');
  await runScript('init-suppliers', 'Criação de fornecedores');
  await runScript('init-admin', 'Criação de usuário administrador');

  console.log('🎉 População do banco concluída!');
}

bootstrap().catch(console.error);
