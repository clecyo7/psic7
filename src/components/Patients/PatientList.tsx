import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Edit, Calendar } from 'lucide-react';
import { PatientForm } from './PatientForm';

interface Patient {
  id: string;
  name: string;
  birth_date: string;
  document: string;
  email: string;
  service_type: string;
}

export function PatientList() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPatient, setEditingPatient] = useState<string | undefined>();

  useEffect(() => {
    loadPatients();
  }, [user]);

  const loadPatients = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .order('name');

      if (error) throw error;
      setPatients(data || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (patientId: string) => {
    setEditingPatient(patientId);
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPatient(undefined);
  };

  const handleSave = () => {
    loadPatients();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600">Carregando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-gray-600 mt-1">Gerencie seus pacientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition"
        >
          <UserPlus className="w-5 h-5" />
          Novo Paciente
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-12 text-center">
          <UserPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-800 mb-2">Nenhum paciente cadastrado</h3>
          <p className="text-gray-600">Comece adicionando seu primeiro paciente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{patient.name}</h3>
                  <p className="text-sm text-gray-600">{patient.email}</p>
                </div>
                <button
                  onClick={() => handleEdit(patient.id)}
                  className="text-blue-600 hover:text-blue-700 transition"
                >
                  <Edit className="w-5 h-5" />
                </button>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Documento:</span>
                  <span className="font-medium text-gray-800">{patient.document}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Nascimento:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Tipo:</span>
                  <span className="font-medium text-gray-800 capitalize">{patient.service_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <PatientForm
          patientId={editingPatient}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
