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
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Pacientes</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Gerencie seus pacientes</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:bg-blue-700 transition text-sm sm:text-base w-full sm:w-auto justify-center"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          Novo Paciente
        </button>
      </div>

      {patients.length === 0 ? (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center">
          <UserPlus className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-2">Nenhum paciente cadastrado</h3>
          <p className="text-sm sm:text-base text-gray-600">Comece adicionando seu primeiro paciente</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {patients.map((patient) => (
            <div
              key={patient.id}
              className="bg-white rounded-xl shadow-md p-4 sm:p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start justify-between mb-3 sm:mb-4">
                <div className="flex-1 min-w-0 pr-2">
                  <h3 className="text-base sm:text-lg font-bold text-gray-800 truncate">{patient.name}</h3>
                  <p className="text-xs sm:text-sm text-gray-600 truncate">{patient.email}</p>
                </div>
                <button
                  onClick={() => handleEdit(patient.id)}
                  className="text-blue-600 hover:text-blue-700 transition flex-shrink-0 p-1"
                  aria-label="Editar paciente"
                >
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
              <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Documento:</span>
                  <span className="font-medium text-gray-800 text-right break-words">{patient.document}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-600">Nascimento:</span>
                  <span className="font-medium text-gray-800">
                    {new Date(patient.birth_date).toLocaleDateString('pt-BR')}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
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
