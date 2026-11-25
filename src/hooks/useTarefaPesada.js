// src/hooks/useTarefaPesada.js
// Embrulha uma tarefa pesada com progresso e cancelamento (Aula 10, Passo 5).
//
// tarefa(sinal, aoProgredir) => Promise<resultado>
//
// Cuidados:
//   - item 24: uma ref de "ainda montado" impede atualizar estado depois que a
//     tela morreu (o aviso de componente desmontado);
//   - item 25: sair da tela cancela o trabalho em curso (retorno do useEffect).

import { useCallback, useEffect, useRef, useState } from 'react';

import { criarSinalDeCancelamento, ProcessamentoCancelado } from '../services/processamento';

export default function useTarefaPesada(tarefa) {
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState(null);

  const montado = useRef(true);
  const sinalAtual = useRef(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      // Sair da tela interrompe o cálculo.
      sinalAtual.current?.cancelar();
    };
  }, []);

  const executar = useCallback(
    async (...args) => {
      sinalAtual.current?.cancelar();
      const sinal = criarSinalDeCancelamento();
      sinalAtual.current = sinal;

      setRodando(true);
      setProgresso(0);
      setErro(null);

      try {
        const saida = await tarefa(
          sinal,
          (feitos, total) => {
            if (montado.current && !sinal.cancelado) setProgresso(total ? feitos / total : 0);
          },
          ...args
        );
        if (montado.current && !sinal.cancelado) setResultado(saida);
        return saida;
      } catch (e) {
        // Só a execução mais recente fala com a tela.
        if (!montado.current || sinalAtual.current !== sinal) return null;
        setErro(e instanceof ProcessamentoCancelado ? 'Verificação cancelada.' : e.message);
        return null;
      } finally {
        if (montado.current && sinalAtual.current === sinal) setRodando(false);
      }
    },
    [tarefa]
  );

  const cancelar = useCallback(() => {
    sinalAtual.current?.cancelar();
  }, []);

  return { executar, cancelar, rodando, progresso, resultado, erro };
}
