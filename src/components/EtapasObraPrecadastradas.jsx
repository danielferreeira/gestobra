import React, { useState } from 'react';
import { Button, Card, Form, Alert, Spinner, Container, Row, Col, ListGroup, Badge } from 'react-bootstrap';
import { FaCheck, FaPlus } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { etapasPadroes } from '../services/etapasService';

const EtapasObraPrecadastradas = ({ obraId, onEtapasAdded }) => {
  const [selecionadas, setSelecionadas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [etapasExistentes, setEtapasExistentes] = useState([]);

  // Verifica quais etapas já existem para esta obra
  const verificarEtapasExistentes = async () => {
    try {
      setLoading(true);
      
      console.log('Verificando etapas existentes para obra ID:', obraId);
      
      if (!obraId) {
        throw new Error('ID da obra não fornecido');
      }
      
      const { data, error } = await supabase
        .from('etapas_obra')
        .select('nome')
        .eq('obra_id', obraId);
      
      if (error) throw error;
      
      console.log('Etapas existentes:', data);
      
      // Mapear apenas os nomes para comparação fácil
      setEtapasExistentes(data.map(etapa => etapa.nome.toLowerCase()));
      
    } catch (err) {
      console.error('Erro ao verificar etapas existentes:', err);
      setError('Não foi possível verificar as etapas existentes: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Executar ao abrir o componente
  React.useEffect(() => {
    console.log('EtapasObraPrecadastradas - obraId:', obraId);
    if (obraId) {
      verificarEtapasExistentes();
    }
  }, [obraId]);

  const toggleEtapa = (index) => {
    if (selecionadas.includes(index)) {
      setSelecionadas(selecionadas.filter(i => i !== index));
    } else {
      setSelecionadas([...selecionadas, index]);
    }
  };

  const adicionarEtapasSelecionadas = async () => {
    if (selecionadas.length === 0) {
      setError('Selecione pelo menos uma etapa para adicionar.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      // Obter a maior ordem atual
      const { data: etapasAtuais, error: errorOrdem } = await supabase
        .from('etapas_obra')
        .select('ordem')
        .eq('obra_id', obraId)
        .order('ordem', { ascending: false })
        .limit(1);

      if (errorOrdem) throw errorOrdem;

      let ordemInicial = 1;
      if (etapasAtuais && etapasAtuais.length > 0) {
        ordemInicial = (etapasAtuais[0].ordem || 0) + 1;
      }

      // Preparar etapas para inserção
      const etapasParaInserir = selecionadas.map((index, i) => {
        const etapa = etapasPadroes[index];
        return {
          obra_id: obraId,
          nome: etapa.nome,
          descricao: etapa.descricao,
          status: 'pendente',
          progresso: 0,
          ordem: ordemInicial + i,
          data_inicio: new Date().toISOString(),
          data_previsao_termino: null,
          valor_previsto: 0,
          valor_realizado: 0,
          progresso_automatico: true
        };
      });

      // Inserir etapas
      const { error: insertError } = await supabase
        .from('etapas_obra')
        .insert(etapasParaInserir);

      if (insertError) throw insertError;

      // Limpar seleção e mostrar mensagem de sucesso
      setSelecionadas([]);
      setSuccess(true);
      
      // Atualizar lista de etapas existentes
      verificarEtapasExistentes();
      
      // Notificar o componente pai
      if (onEtapasAdded) {
        onEtapasAdded();
      }

    } catch (err) {
      console.error('Erro ao adicionar etapas:', err);
      setError('Erro ao adicionar etapas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const etapaJaExiste = (nome) => {
    return etapasExistentes.includes(nome.toLowerCase());
  };

  return (
    <Container className="my-4">
      <Card>
        <Card.Header as="h5">Adicionar Etapas Padrão</Card.Header>
        <Card.Body>
          {error && <Alert variant="danger">{error}</Alert>}
          {success && <Alert variant="success">Etapas adicionadas com sucesso!</Alert>}
          
          <p>Selecione as etapas padrão que deseja adicionar ao seu projeto:</p>
          
          <ListGroup>
            {etapasPadroes.map((etapa, index) => {
              const jaExiste = etapaJaExiste(etapa.nome);
              return (
                <ListGroup.Item 
                  key={index}
                  action={!jaExiste}
                  onClick={() => !jaExiste && toggleEtapa(index)}
                  active={selecionadas.includes(index)}
                  disabled={jaExiste}
                  className="d-flex justify-content-between align-items-center"
                >
                  <div>
                    <h6>{etapa.nome}</h6>
                    <small>{etapa.descricao}</small>
                  </div>
                  {jaExiste ? (
                    <Badge bg="secondary">Já adicionada</Badge>
                  ) : selecionadas.includes(index) ? (
                    <FaCheck className="text-white" />
                  ) : (
                    <FaPlus />
                  )}
                </ListGroup.Item>
              );
            })}
          </ListGroup>
          
          <div className="d-flex justify-content-end mt-3">
            <Button 
              variant="primary" 
              onClick={adicionarEtapasSelecionadas} 
              disabled={loading || selecionadas.length === 0}
            >
              {loading ? (
                <>
                  <Spinner animation="border" size="sm" /> Adicionando...
                </>
              ) : (
                'Adicionar Etapas Selecionadas'
              )}
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default EtapasObraPrecadastradas; 