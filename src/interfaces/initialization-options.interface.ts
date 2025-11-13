// src/core/initialization/interfaces/initialization-options.interface.ts
export interface InitializationOptions {
  /**
   * Habilita/desabilita a inicialização automática
   * @default true
   */
  enabled: boolean;
  
  /**
   * Força a reexecução mesmo se os dados já existirem
   * @default false
   */
  force: boolean;
  
  /**
   * Logs detalhados do processo
   * @default true
   */
  verbose: boolean;
}