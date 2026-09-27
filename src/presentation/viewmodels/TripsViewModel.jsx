import { listDestinationsWithState } from "../../domain/usecases/destinationPacks.jsx";
import { createItineraryId, deleteItinerary, listItineraries, saveItinerary } from "../../domain/usecases/trips.jsx";
import { userMessage } from "../../core/errors/appError.jsx";
import { ViewModel } from "../viewmodel/ViewModel.jsx";
const LOCAL_OWNER_KEY = 'local-device';

/** Personal itineraries stored locally for this device. */
export class TripsViewModel extends ViewModel {
  constructor(tripsDeps, destinationDeps, nav = {}) {
    super({
      mode: 'list',
      trips: [],
      selected: null,
      form: {
        title: '',
        travelDate: '',
        notes: '',
        stops: []
      },
      downloadedIds: [],
      destinations: [],
      loading: true,
      busy: false,
      error: null
    });
    this.tripsDeps = tripsDeps;
    this.destinationDeps = destinationDeps;
    this.nav = nav;
  }
  onInit = () => {
    void this.load();
  };
  /** Downloaded-pack readiness for a trip's stops. */
  tripReadiness = trip => {
    const missingStops = trip.stops.filter(stop => !this.state.downloadedIds.includes(stop.destinationId));
    const ready = trip.stops.length - missingStops.length;
    const total = trip.stops.length;
    return {
      ready,
      total,
      percent: total ? Math.round(ready / total * 100) : 0,
      missingStops
    };
  };
  load = async () => {
    const meta = await this.destinationDeps.packRepository.listDownloadedMeta().catch(() => []);
    const downloadedIds = meta.map(entry => entry.packId);
    this.setState({
      downloadedIds
    });
    try {
      const {
        items
      } = await listDestinationsWithState(this.destinationDeps);
      this.setState({
        destinations: items
      });
    } catch {
      // Catalog failures keep any previously known destinations; trip storage is local.
    }
    this.setState({
      loading: true
    });
    try {
      const trips = await listItineraries(this.tripsDeps, LOCAL_OWNER_KEY);
      this.setState({
        trips,
        error: null,
        loading: false
      });
    } catch (error) {
      this.setState({
        error: userMessage(error, 'Saved itineraries could not be loaded.'),
        loading: false
      });
    }
  };
  openCreate = () => {
    this.setState({
      mode: 'create',
      selected: null,
      form: {
        title: '',
        travelDate: '',
        notes: '',
        stops: []
      },
      error: null
    });
  };
  openEdit = trip => {
    this.setState({
      mode: 'edit',
      selected: trip,
      form: {
        title: trip.title,
        travelDate: trip.travelDate,
        notes: trip.notes ?? '',
        stops: trip.stops.map(stop => ({
          ...stop
        }))
      },
      error: null
    });
  };
  cancelCreate = () => {
    this.setState({
      mode: this.state.selected ? 'details' : 'list',
      error: null
    });
  };
  openDetails = trip => {
    this.setState({
      mode: 'details',
      selected: trip,
      error: null
    });
  };
  openDestination = destinationId => {
    this.nav.onOpenDestination?.(destinationId);
  };
  backToList = () => {
    this.setState({
      mode: 'list',
      selected: null,
      error: null
    });
  }; // ----- Create form -----
  setFormField = patch => {
    this.setState(previous => ({
      form: {
        ...previous.form,
        ...patch
      }
    }));
  };
  addStop = (destinationId, destinationName, municipality) => {
    this.setState(previous => {
      if (previous.form.stops.some(stop => stop.destinationId === destinationId)) {
        return {};
      }
      return {
        form: {
          ...previous.form,
          stops: [...previous.form.stops, {
            destinationId,
            destinationName,
            municipality,
            plannedTime: '',
            note: ''
          }]
        }
      };
    });
  };
  updateStop = (index, patch) => {
    this.setState(previous => ({
      form: {
        ...previous.form,
        stops: previous.form.stops.map((stop, stopIndex) => stopIndex === index ? {
          ...stop,
          ...patch
        } : stop)
      }
    }));
  };
  moveStop = (index, direction) => {
    this.setState(previous => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= previous.form.stops.length) return {};
      const stops = [...previous.form.stops];
      [stops[index], stops[nextIndex]] = [stops[nextIndex], stops[index]];
      return {
        form: {
          ...previous.form,
          stops
        }
      };
    });
  };
  removeStop = index => {
    this.setState(previous => ({
      form: {
        ...previous.form,
        stops: previous.form.stops.filter((_, stopIndex) => stopIndex !== index)
      }
    }));
  };
  validateForm = () => {
    const {
      title,
      travelDate,
      stops
    } = this.state.form;
    if (title.trim().length < 2) return 'Enter a trip name.';
    const normalizedDate = travelDate.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalizedDate)) return 'Choose a valid travel date.';
    const [year, month, day] = normalizedDate.split('-').map(Number);
    const parsedDate = new Date(year, month - 1, day);
    if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) return 'Choose a valid travel date.';
    if (stops.length === 0) return 'Add at least one destination to the itinerary.';
    return null;
  };
  save = async () => {
    const validationError = this.validateForm();
    if (validationError) {
      this.setState({
        error: validationError
      });
      return false;
    }
    const now = Date.now();
    const existingTrip = this.state.mode === 'edit' ? this.state.selected : null;
    const trip = {
      id: existingTrip?.id ?? createItineraryId(),
      ownerKey: LOCAL_OWNER_KEY,
      title: this.state.form.title.trim(),
      travelDate: this.state.form.travelDate.trim(),
      notes: this.state.form.notes.trim(),
      stops: this.state.form.stops,
      createdAt: existingTrip?.createdAt ?? now,
      updatedAt: now
    };
    this.setState({
      busy: true,
      error: null
    });
    try {
      await saveItinerary(this.tripsDeps, trip);
      await this.load();
      this.setState({
        mode: 'list',
        selected: null
      });
      return true;
    } catch (error) {
      this.setState({
        error: userMessage(error, 'The itinerary could not be saved.')
      });
      return false;
    } finally {
      this.setState({
        busy: false
      });
    }
  };
  deleteSelected = async () => {
    const trip = this.state.selected;
    if (!trip) return false;
    this.setState({
      busy: true
    });
    try {
      await deleteItinerary(this.tripsDeps, trip.id, LOCAL_OWNER_KEY);
      await this.load();
      this.setState({
        mode: 'list',
        selected: null
      });
      return true;
    } catch (error) {
      this.setState({
        error: userMessage(error, 'The itinerary could not be deleted.'),
        mode: 'list',
        selected: null
      });
      return false;
    } finally {
      this.setState({
        busy: false
      });
    }
  };
  /** Destination ids already added to the current form. */
  isStopAdded = destinationId => {
    return this.state.form.stops.some(stop => stop.destinationId === destinationId);
  };
}
