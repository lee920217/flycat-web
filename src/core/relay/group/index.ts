import { Relay } from "../type";
import { seedGroups } from "./seed";
import { RelayGroupStorage } from "./store";
import { RelayGroupMap } from "./type";

export class RelayGroup {
	map: RelayGroupMap;
	author: string;
	store: RelayGroupStorage;

	constructor(pubkey: string){
		this.author = pubkey;
		this.store = new RelayGroupStorage(pubkey); 
 
		// todo: this might be async when using other storeAdapter
		this.map = this.store.load() || new Map(Object.entries(seedGroups));
	}

	reInitGroups(groups: RelayGroupMap){
		this.map = groups;
		this.store.save(this.map);
	}

	async loadFromStore(){
		this.map = await this.store.load() || new Map(Object.entries(seedGroups));
	}

	getAllGroupIds(){
		return Array.from(this.map.keys());
	}

	getGroupById(id: string){
		return this.map.get(id);
	}

	setGroup(id: string, val: Relay[]){
		this.map.set(id, val);
		this.store.save(this.map);
	}

	isRelayExistInGroup(id: string, val: Relay): boolean{
		// relay url is the primary key
		const data = this.map.get(id);
		if(data == null){
			return false;
		}
		return data.filter(r => r.url === val.url).length > 0;
	}

	addNewRelayToGroup(id: string, newItem: Relay){
		const data = this.map.get(id);
		if(data == null){
			this.map.set(id, [newItem]);
			this.store.save(this.map);
			return;
		}

		
		if(this.isRelayExistInGroup(id, newItem)){
			return;
		}

		data.push(newItem);
		this.map.set(id, data);
		this.store.save(this.map);
	}

	delRelayInGroup(id: string, relay: Relay){
		const data = this.map.get(id);
		if(data == null){
			throw new Error("group not found!");
		}

		if(!this.isRelayExistInGroup(id, relay)){
			throw new Error("relay not exits in group!");
		}

		const newData = data.filter(r => r.url !== relay.url);
		this.map.set(id, newData);
		this.store.save(this.map);
	}
}
