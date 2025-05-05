// @ts-nocheck
import React from "react";
import { Button, Modal, Select } from "flowbite-react";
import { useEffect, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { FiDownload, FiShare2, FiTrash2, FiEye, FiSearch } from "react-icons/fi";
import { motion } from "framer-motion";
import line from "./assets/line.png";


function App() {
  const [sendLoading, setSendLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedImageId, setSelectedImageId] = useState(null);
  const [selectedShareId, setSelectedShareId] = useState(null);
  const [selectedDeleteId, setSelectedDeleteId] = useState(null);
  const [formData, setFormData] = useState({ name: "", number: "" });
  const [openModal, setOpenModal] = useState(false);
  const [openImage, setOpenImage] = useState(false);
  const [openShareModal, setOpenShareModal] = useState(false);
  const [shareImageUrl, setShareImageUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);
  const [errorMessages, setErrorMessages] = useState({ name: "", number: "" });
  const [imageLoading, setImageLoading] = useState({});

  const baseURL = "https://hedayat-engagement-backend-3aj8.vercel.app/";

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrorMessages({ ...errorMessages, [name]: "" });
  };

  const fetchData = async (retries = 3) => {
    try {
      const response = await axios.get(baseURL + "guests_list");
      const reversedData = response.data.reverse() || [];
      setData(reversedData);
      setFilteredData(reversedData);
    } catch (error) {
      console.error("Error fetching data:", error);
      if (retries > 0 && error.response?.status === 500) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        return fetchData(retries - 1);
      }
      toast.error("Fehler beim Abrufen der Daten. Bitte versuchen Sie es später erneut.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    const filtered = data.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    setFilteredData(filtered);
  }, [searchQuery, data]);

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await axios.delete(`${baseURL}guests_list/${id}`);
      fetchData();
      setOpenModal(false);
      toast.success("Karte erfolgreich gelöscht!");
    } catch (error) {
      console.error("Error deleting item:", error);
      toast.error("Fehler beim Löschen der Karte.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const validateForm = () => {
    let isValid = true;
    const errors = {};
    if (!formData.name) {
      errors.name = "Name ist erforderlich!";
      isValid = false;
    }
    if (!formData.number) {
      errors.number = "Anzahl der Personen ist erforderlich!";
      isValid = false;
    }
    setErrorMessages(errors);
    return isValid;
  };

  const addLineBreak = (text) => {
    if (text.includes(" and ")) {
      text = text.replace(" and ", " and\n");
    }
    return text;
  };

  const submitForm = async () => {
    const isValid = validateForm();
    const payload = {
      name: addLineBreak(formData.name),
      twoNames: formData.name.includes(" and "),
      number: formData.number,
    };

    if (isValid) {
      try {
        setSendLoading(true);
        await axios.post(baseURL + "fill-image", payload);
        toast.success(`Einladungskarte für ${formData.name} erstellt!`);
        fetchData();
        setFormData({ name: "", number: "" });
      } catch (error) {
        console.error("Error submitting form:", error);
        toast.error("Fehler beim Erstellen der Karte.");
      } finally {
        setSendLoading(false);
      }
    } else {
      toast.error("Bitte geben Sie einen Namen und eine Nummer ein!");
    }
  };

  const shareImage = async (name, id) => {
    try {
      setImageLoading((prev) => ({ ...prev, [id]: true }));
      console.log(`Attempting to share image for guest ID: ${id}, name: ${name}`);

      // Fetch image from backend
      const response = await axios.get(`${baseURL}get-image/${id}`, {
        responseType: "blob",
      });
      const blob = response.data;
      console.log(`Image blob size: ${blob.size} bytes, type: ${blob.type}`);

      // Try Web Share API if supported
      if (navigator.canShare) {
        const file = new File([blob], `${name}.jpg`, { type: "image/jpeg" });
        console.log(`File created: ${file.name}, size: ${file.size} bytes`);

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: "Einladungskarte",
            text: `Einladungskarte für ${name}`,
            files: [file],
          });
          console.log("Image shared successfully via Web Share API");
          toast.success("Bild erfolgreich geteilt!");
          return;
        } else {
          console.log("Web Share API supports sharing but not files; falling back to modal");
        }
      } else {
        console.log("Web Share API not supported; falling back to modal");
      }

      // Fallback: Open modal with image as data URL
      const reader = new FileReader();
      reader.onloadend = () => {
        setShareImageUrl(reader.result);
        setSelectedShareId(id);
        setOpenShareModal(true);
        console.log("Share modal opened with data URL");
      };
      reader.readAsDataURL(blob);
      toast.success("Bitte halten Sie das Bild gedrückt, um es zu teilen.");
    } catch (error) {
      console.error("Error sharing image:", error);
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Fehler beim Teilen des Bildes.";
      toast.error(errorMessage);
    } finally {
      setImageLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const downloadImage = async (name, id) => {
    try {
      setImageLoading((prev) => ({ ...prev, [id]: true }));
      const response = await axios.get(`${baseURL}get-image/${id}`, {
        responseType: "blob",
      });
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${name}.jpg`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading image:", error);
      const errorMessage = error.response?.data?.message || "Fehler beim Herunterladen des Bildes.";
      toast.error(errorMessage);
    } finally {
      setImageLoading((prev) => ({ ...prev, [id]: false }));
    }
  };

  const getTotal = () => {
    return data.reduce((total, item) => total + parseInt(item.number), 0);
  };

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  return (
    <div className="min-h-screen bg-gray-50 px-2 sm:px-4">
      {loading ? (
        <div className="flex items-center justify-center h-screen">
          <div className="flex flex-col items-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-[#7d5438]"></div>
            <span className="text-gray-600 font-medium">Lädt...</span>
          </div>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <Toaster position="top-right" />
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex flex-col space-y-3 items-center justify-center mb-6">
            <img src={line} alt="" className="w-72 rotate-180" />
            <h1 className="text-lg md:text-2xl text-[#7d5438] sm:text-2xl md:text-3xl font-bold text-center">
            Verlobung Hedayat & Hasina – Gästeliste
            </h1>
            {/* <img src={line} alt="" className="w-64 opacity-80" /> */}
            </div>
            <div className="h-px bg-gray-200 mb-12"></div>

            <form className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-12">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Vorname, Nachname
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Max Mustermann"
                  className={`w-full px-4 py-3 rounded-lg border ${
                    errorMessages.name ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-[#7d5438] transition`}
                />
                {errorMessages.name && (
                  <p className="mt-1 text-sm text-red-500">
                    {errorMessages.name}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anzahl der Personen
                </label>
                <Select
                  name="number"
                  value={formData.number}
                  onChange={handleChange}
                  className={`w-full rounded-lg border ${
                    errorMessages.number ? "border-red-500" : "border-gray-300"
                  } focus:outline-none focus:ring-2 focus:ring-[#7d5438]`}
                >
                  <option value="" disabled>
                    Anzahl auswählen
                  </option>
                  {[...Array(100)].map((_, i) => (
                    <option key={i} value={i + 1}>
                      {i + 1}
                    </option>
                  ))}
                </Select>
                {errorMessages.number && (
                  <p className="mt-1 text-sm text-red-500">
                    {errorMessages.number}
                  </p>
                )}
              </div>
            </form>

            <div className="flex justify-end mb-12">
              <button
                onClick={submitForm}
                disabled={sendLoading}
                className="bg-[#7d5438] text-white font-semibold py-3 px-6 rounded-lg flex items-center space-x-2 hover:bg-[#6b472f] transition disabled:opacity-50"
              >
                {sendLoading ? (
                  <>
                    <span>Erstelle</span>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="animate-spin size-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
                  </>
                ) : (
                  <>
                    <span>Erstellen</span>
                    <svg
                      className="h-5 w-5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M12 4v16m8-8H4"
                      />
                    </svg>
                  </>
                )}
              </button>
            </div>

            <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">GESAMT</span>
                <span className="text-lg font-bold text-[#7d5438]">
                  {filteredData.length}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-500">
                  PERSONEN
                </span>
                <span className="text-lg font-bold text-[#7d5438]">
                  {getTotal()}
                </span>
              </div>
            </div>

            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Nach Namen suchen"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-3 pl-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#7d5438] transition"
              />
              <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            <div className="bg-white rounded-lg shadow overflow-x-auto">
              <table className="w-full text-sm text-gray-500 min-w-[640px]">
                <thead className="bg-gray-50 text-xs uppercase text-gray-700">
                  <tr>
                    <th className="px-4 sm:px-6 py-4 text-left">Nr.</th>
                    <th className="px-4 sm:px-6 py-4 text-left">Name</th>
                    <th className="px-4 sm:px-6 py-4 text-left">Anzahl</th>
                    <th className="px-4 sm:px-6 py-4 text-center">Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.map((item, index) => (
                    <tr
                      key={item._id}
                      className="border-b hover:bg-gray-50 transition"
                    >
                      <td className="px-4 sm:px-6 py-4">{indexOfFirstItem + index + 1}</td>
                      <td className="px-4 sm:px-6 py-4 font-medium text-gray-900">
                        {item.name}
                      </td>
                      <td className="px-4 sm:px-6 py-4">{item.number}</td>
                      <td className="px-4 sm:px-6 py-4 flex justify-center gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            setSelectedImageId(item._id);
                            setOpenImage(true);
                          }}
                          className="p-2 text-[#7d5438] hover:bg-[#7d5438] hover:text-white rounded-lg transition"
                          title="Anzeigen"
                        >
                          <FiEye size={20} />
                        </button>
                        <button
                          onClick={() => downloadImage(item.name, item._id)}
                          disabled={imageLoading[item._id]}
                          className={`p-2 ${
                            imageLoading[item._id]
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-[#7d5438] hover:bg-[#7d5438] hover:text-white"
                          } rounded-lg transition`}
                          title="Download"
                        >
                          {imageLoading[item._id] ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="animate-spin size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          ) : (
                            <FiDownload size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => shareImage(item.name, item._id)}
                          disabled={imageLoading[item._id]}
                          className={`p-2 ${
                            imageLoading[item._id]
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-[#7d5438] hover:bg-[#7d5438] hover:text-white"
                          } rounded-lg transition`}
                          title="Teilen"
                        >
                          {imageLoading[item._id] ? (
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="animate-spin size-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                          </svg>
                          ) : (
                            <FiShare2 size={20} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedDeleteId(item._id);
                            setOpenModal(true);
                          }}
                          className="p-2 text-red-600 hover:bg-red-600 hover:text-white rounded-lg transition"
                          title="Löschen"
                        >
                          <FiTrash2 size={20} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {currentItems.map((item) => (
              <React.Fragment key={`modal-${item._id}`}>
                <Modal
                  show={openImage && selectedImageId === item._id}
                  size="lg"
                  onClose={() => {
                    setOpenImage(false);
                    setSelectedImageId(null);
                  }}
                >
                  <Modal.Header>Anzeigen</Modal.Header>
                  <Modal.Body>
                    <img
                      src={`${baseURL}get-image/${item._id}`}
                      alt="Invitation"
                      className="w-full rounded-lg"
                    />
                  </Modal.Body>
                </Modal>
                <Modal
                  show={openShareModal && selectedShareId === item._id}
                  size="lg"
                  onClose={() => {
                    setOpenShareModal(false);
                    setSelectedShareId(null);
                    setShareImageUrl("");
                  }}
                >
                  <Modal.Header>Teilen</Modal.Header>
                  <Modal.Body>
                    <p className="text-gray-600 mb-4">
                      Halten Sie das Bild gedrückt, um es zu teilen (z.B. über WhatsApp, E-Mail order Airdrop).
                    </p>
                    <img
                      src={shareImageUrl}
                      alt="Invitation"
                      className="w-full rounded-lg"
                    />
                  </Modal.Body>
                </Modal>
                <Modal
                  show={openModal && selectedDeleteId === item._id}
                  size="md"
                  onClose={() => {
                    setOpenModal(false);
                    setSelectedDeleteId(null);
                  }}
                >
                  <Modal.Header>Bestätigung</Modal.Header>
                  <Modal.Body>
                    <div className="text-center">
                      <svg
                        className="mx-auto mb-4 h-12 w-12 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth="2"
                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <h3 className="mb-5 text-lg font-normal text-gray-500">
                        Möchten Sie diese Karte wirklich löschen?
                      </h3>
                      <div className="flex justify-center gap-4">
                        <Button
                          color="failure"
                          onClick={() => handleDelete(item._id)}
                          disabled={deleteLoading}
                        >
                          {deleteLoading ? (
                            <>
                              <span>Löschen</span>
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="animate-spin ml-2 size-5">
  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
</svg>
                            </>
                          ) : (
                            "Ja, löschen"
                          )}
                        </Button>
                        <Button
                          color="gray"
                          onClick={() => {
                            setOpenModal(false);
                            setSelectedDeleteId(null);
                          }}
                        >
                          Abbrechen
                        </Button>
                      </div>
                    </div>
                  </Modal.Body>
                </Modal>
              </React.Fragment>
            ))}

            <div className="mt-8 flex flex-col items-center">
              <div className="flex space-x-2 mb-4 flex-wrap justify-center gap-2">
                {Array.from(
                  { length: Math.ceil(filteredData.length / itemsPerPage) },
                  (_, i) => (
                    <button
                      key={i}
                      onClick={() => paginate(i + 1)}
                      className={`px-4 py-2 rounded-lg ${
                        currentPage === i + 1
                          ? "bg-[#7d5438] text-white"
                          : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                      } transition`}
                    >
                      {i + 1}
                    </button>
                  )
                )}
              </div>
              <p className="text-sm text-gray-500 text-center">
                Anzeige{" "}
                <strong>
                  {Math.min(
                    (currentPage - 1) * itemsPerPage + 1,
                    filteredData.length
                  )}
                </strong>{" "}
                bis{" "}
                <strong>
                  {Math.min(currentPage * itemsPerPage, filteredData.length)}
                </strong>{" "}
                von <strong>{filteredData.length}</strong> Karten
              </p>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

export default App;