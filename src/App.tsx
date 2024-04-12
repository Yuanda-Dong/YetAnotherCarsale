import { useEffect, useState } from "react";
import { User, createClient } from "@supabase/supabase-js";
import { Button, Image, Stack } from "react-bootstrap";
import { faker } from "@faker-js/faker";
import "bootstrap/dist/css/bootstrap.min.css";

const supabase = createClient(
	"https://sbrnvzmokzacaxawpfmw.supabase.co",
	"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNicm52em1va3phY2F4YXdwZm13Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MTI3NDY4MzAsImV4cCI6MjAyODMyMjgzMH0.dNgy3zEs_fY51kxjvD_9cqk_I1fYTc-sME8mf18xITE"
);
const TrashIcon = ({ onClick }) => (
	<button onClick={onClick}>
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="16"
			height="16"
			fill="currentColor"
			className="bi bi-trash"
			viewBox="0 0 16 16"
		>
			<path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6z" />
			<path
				fill-rule="evenodd"
				d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118zM2.5 3V2h11v1h-11z"
			/>
		</svg>
	</button>
);

function UserCard({ user }: { user: User }) {
	return (
		<div className="mb-2">
			<h3>Hi! {user.user_metadata.full_name}</h3>
			<Image src={user.user_metadata.avatar_url}></Image>
		</div>
	);
}

function CarRow({ car, del = false }) {
	return (
		<tr>
			<td>{car.model}</td>
			<td>{car.manufacturer}</td>
			{del && (
				<TrashIcon onClick={async () => await supabase.from("Carsale").delete().eq("id", car.id)} />
			)}
		</tr>
	);
}

interface Car {
	model: string;
	manufacturer: string;
}

export default function App() {
	const [user, setUser] = useState<User | null>(null);
	const [cars, setCars] = useState<Car[]>([]);
	const [myCars, setMyCars] = useState<Car[]>([]);

	function handleAllCarsUpdate(update) {
		if (update.eventType === "DELETE") {
			setCars((prevCars) => prevCars.filter((c) => c.id !== update.old.id));
		} else {
			setCars((prevCars) => [...prevCars, update.new]);
		}
	}
	function handleMyCarsUpdate(update) {
		if (update.eventType === "DELETE") {
			setMyCars((prevCars) => prevCars.filter((c) => c.id !== update.old.id));
		} else {
			setMyCars((prevCars) => [...prevCars, update.new]);
		}
	}

	useEffect(() => {
		async function onLoad() {
			// set active user
			const {
				data: { user },
			} = await supabase.auth.getUser();
			setUser(user);
			// load all cars
			const { data: cars } = await supabase.from("Carsale").select();
			setCars(cars);
			// load my cars
			if (user) {
				const { data: myCars } = await supabase.from("Carsale").select().eq("owner", user?.id);
				setMyCars(myCars);
			}
			// set up listener for all cars
			supabase
				.channel("public:Carsale")
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "Carsale" },
					handleAllCarsUpdate
				)
				.subscribe();
			// set up listener for my cars
			supabase
				.channel(`public:Carsale:owner=eq.${user?.id}`)
				.on(
					"postgres_changes",
					{ event: "*", schema: "public", table: "Carsale", filter: `owner=eq.${user?.id}` },
					handleMyCarsUpdate
				)
				.subscribe();
		}
		onLoad();
	}, []);

	async function signInWithGoogle() {
		await supabase.auth.signInWithOAuth({
			provider: "google",
		});
	}

	async function signOut() {
		await supabase.auth.signOut();
		setUser(null);
	}

	async function addCar() {
		await supabase
			.from("Carsale")
			.insert({ model: faker.vehicle.model(), manufacturer: faker.vehicle.manufacturer() });
	}

	return (
		<>
			{user ? <UserCard user={user} /> : <h3>Not SignedIn</h3>}
			<Button onClick={signInWithGoogle}>Sign In</Button>
			<Button onClick={signOut}>Sign Out</Button>
			<hr />
			<div style={{ display: "flex", justifyContent: "space-evenly" }}>
				<div className="p-2">
					<h3>All Cars</h3>
					<table>
						<tr>
							<th>Model</th>
							<th>Manufacturer</th>
						</tr>
						{cars.map((car) => (
							<CarRow car={car} key={car.id}></CarRow>
						))}
					</table>
				</div>
				<div className="p-2">
					<h3>My Cars</h3>
					<table>
						<tr>
							<th>Model</th>
							<th>Manufacturer</th>
						</tr>
						{myCars.map((car) => (
							<CarRow car={car} key={car.id} del></CarRow>
						))}
					</table>
				</div>
			</div>
			<Button onClick={addCar} style={{ display: "block", margin: "auto" }}>
				Add new car
			</Button>
		</>
	);
}
